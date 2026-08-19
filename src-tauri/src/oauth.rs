//! Desktop Google OAuth via the system browser + a local loopback server.
//!
//! Google's web-only popup (GIS) can't run from the `tauri://localhost`
//! origin, so the packaged app uses the standard desktop flow instead:
//! PKCE authorization code with `open`-in-browser and a loopback redirect.
//! Only the narrow `drive.appdata` scope (plus openid profile) is requested.

use std::collections::HashMap;
use std::sync::mpsc;
use std::time::Duration;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::Serialize;
use sha2::{Digest, Sha256};

const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v3/userinfo";

/// Fixed loopback port — add `http://localhost:41909/callback` to the
/// OAuth client's authorized redirect URIs (see README).
const REDIRECT_PORT: u16 = 41909;
const REDIRECT_PATH: &str = "/callback";

#[derive(Serialize)]
pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: u64,
}

#[derive(Serialize, Clone)]
pub struct UserInfo {
    pub sub: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub picture: Option<String>,
}

fn random_url_safe(count: usize) -> String {
    let mut bytes = vec![0u8; count];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn code_challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

fn percent_encode(input: &str) -> String {
    let mut out = String::new();
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'%' if index + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[index + 1..index + 3])
                    .ok()
                    .and_then(|h| u8::from_str_radix(h, 16).ok());
                if let Some(value) = hex {
                    out.push(value);
                    index += 3;
                    continue;
                }
                out.push(bytes[index]);
            }
            b'+' => out.push(b' '),
            other => out.push(other),
        }
        index += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn parse_query(url: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    if let Some(query) = url.split('?').nth(1) {
        for pair in query.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                map.insert(key.to_string(), percent_decode(value));
            }
        }
    }
    map
}

fn extract_tokens(json: &serde_json::Value) -> Result<OAuthTokens, String> {
    if let Some(error) = json.get("error").and_then(|v| v.as_str()) {
        return Err(format!("Google token error: {error}"));
    }
    Ok(OAuthTokens {
        access_token: json
            .get("access_token")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        refresh_token: json
            .get("refresh_token")
            .and_then(|v| v.as_str())
            .map(String::from),
        expires_in: json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600),
    })
}

fn parse_json_response(response: ureq::Response) -> Result<serde_json::Value, String> {
    let body = response
        .into_string()
        .map_err(|err| format!("Failed to read response: {err}"))?;
    serde_json::from_str(&body).map_err(|err| format!("Bad JSON response: {err}"))
}

fn exchange_code(
    client_id: &str,
    code: &str,
    redirect_uri: &str,
    verifier: &str,
) -> Result<OAuthTokens, String> {
    let response = ureq::post(TOKEN_ENDPOINT)
        .send_form(&[
            ("code", code),
            ("client_id", client_id),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier),
        ])
        .map_err(|err| format!("Token request failed: {err}"))?;
    extract_tokens(&parse_json_response(response)?)
}

fn run_oauth_flow(client_id: &str, scopes: &str) -> Result<OAuthTokens, String> {
    let verifier = random_url_safe(48);
    let challenge = code_challenge(&verifier);
    let state = random_url_safe(24);
    let redirect_uri = format!("http://localhost:{REDIRECT_PORT}{REDIRECT_PATH}");

    let listener = std::net::TcpListener::bind(("127.0.0.1", REDIRECT_PORT))
        .map_err(|err| format!("Failed to bind loopback port {REDIRECT_PORT}: {err}"))?;
    let server = tiny_http::Server::from_listener(listener, None)
        .map_err(|err| format!("Failed to start loopback server: {err}"))?;

    let (sender, receiver) = mpsc::channel::<Result<(String, String), String>>();
    std::thread::spawn(move || {
        let result = (|| -> Result<(String, String), String> {
            let request = server
                .recv()
                .map_err(|err| format!("Loopback server error: {err}"))?;
            let url = request.url().to_string();
            let params = parse_query(&url);
            if let Some(error) = params.get("error") {
                return Err(format!("Google returned an error: {error}"));
            }
            let code = params
                .get("code")
                .cloned()
                .ok_or_else(|| "Missing authorization code".to_string())?;
            let received_state = params.get("state").cloned().unwrap_or_default();
            let _ = request.respond(
                tiny_http::Response::from_string(
                    "Sign-in complete. You can close this window and return to SnippetVault.",
                )
                .with_status_code(200),
            );
            Ok((code, received_state))
        })();
        let _ = sender.send(result);
    });

    let auth_url = format!(
        "{AUTH_ENDPOINT}?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&state={}&access_type=offline&prompt=consent",
        percent_encode(client_id),
        percent_encode(&redirect_uri),
        percent_encode(scopes),
        percent_encode(&challenge),
        percent_encode(&state),
    );
    open::that(&auth_url).map_err(|err| format!("Failed to open browser: {err}"))?;

    let (code, received_state) = receiver
        .recv_timeout(Duration::from_secs(300))
        .map_err(|_| "Sign-in timed out. Please try again.".to_string())??;

    if received_state != state {
        return Err("State mismatch during sign-in. Please try again.".to_string());
    }

    exchange_code(client_id, &code, &redirect_uri, &verifier)
}

/// Full desktop sign-in: opens the system browser, captures the loopback
/// redirect, and exchanges the authorization code for tokens.
#[tauri::command]
pub async fn drive_oauth(client_id: String, scopes: String) -> Result<OAuthTokens, String> {
    tauri::async_runtime::spawn_blocking(move || run_oauth_flow(&client_id, &scopes))
        .await
        .map_err(|err| err.to_string())?
}

/// Exchanges a stored refresh token for a fresh access token.
#[tauri::command]
pub fn drive_refresh(refresh_token: String, client_id: String) -> Result<OAuthTokens, String> {
    let response = ureq::post(TOKEN_ENDPOINT)
        .send_form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", &refresh_token),
            ("client_id", &client_id),
        ])
        .map_err(|err| format!("Token refresh failed: {err}"))?;
    extract_tokens(&parse_json_response(response)?)
}

/// Fetches the signed-in user's basic profile (name, email, picture).
#[tauri::command]
pub fn drive_userinfo(access_token: String) -> Result<UserInfo, String> {
    let response = ureq::get(USERINFO_ENDPOINT)
        .set("Authorization", &format!("Bearer {access_token}"))
        .call()
        .map_err(|err| format!("User info request failed: {err}"))?;
    let json = parse_json_response(response)?;
    Ok(UserInfo {
        sub: json.get("sub").and_then(|v| v.as_str()).map(String::from),
        name: json.get("name").and_then(|v| v.as_str()).map(String::from),
        email: json.get("email").and_then(|v| v.as_str()).map(String::from),
        picture: json.get("picture").and_then(|v| v.as_str()).map(String::from),
    })
}
