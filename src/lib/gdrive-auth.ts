/**
 * Google Drive authentication.
 *
 * Two flows, selected at runtime:
 * - **Desktop (Tauri)**: the Rust backend opens the system browser for the
 *   Google consent screen, captures the loopback redirect, and exchanges the
 *   PKCE code — returning tokens + the user profile. Refresh tokens are used
 *   for silent re-auth after the 1h access token expires.
 * - **Browser**: Google Identity Services (GIS) token client.
 *
 * Tokens are persisted to localStorage so reloads reuse them until expiry.
 */

import { invoke } from "@tauri-apps/api/core";

export const GDRIVE_SCOPES =
  "openid email profile https://www.googleapis.com/auth/drive.appdata";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const TOKEN_STORAGE_KEY = "snippetvault-gdrive-token";
const REFRESH_STORAGE_KEY = "snippetvault-gdrive-refresh";
const USER_STORAGE_KEY = "snippetvault-gdrive-user";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface UserInfo {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: unknown) => void;
  prompt?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: {
    prompt?: string;
    callback?: (response: TokenResponse) => void;
  }) => void;
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: TokenClientConfig) => TokenClient;
    revoke: (token: string, done?: () => void) => void;
  };
}

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

/** Detects whether the app is running inside the Tauri (desktop) shell. */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window &&
    typeof invoke === "function"
  );
}

/** Reads the OAuth client id from the environment (VITE_GOOGLE_CLIENT_ID). */
export function getClientId(): string | null {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null;
}

let scriptPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;
let refreshToken: string | null = null;

function loadGsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity Services."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function loadStoredToken(): void {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { token: string; expiry: number };
      if (parsed.expiry > Date.now()) {
        accessToken = parsed.token;
        tokenExpiry = parsed.expiry;
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    // Corrupt storage — ignore and stay signed out.
  }
}

function persistToken(token: string, expiresIn: number): void {
  accessToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
  try {
    window.localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token, expiry: tokenExpiry }),
    );
  } catch {
    // Storage may be unavailable (private mode) — keep the in-memory token.
  }
}

function persistRefreshToken(token: string): void {
  refreshToken = token;
  try {
    window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
  } catch {
    // Ignore.
  }
}

function clearToken(): void {
  accessToken = null;
  tokenExpiry = 0;
  refreshToken = null;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

async function initTokenClient(): Promise<TokenClient> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error(
      "Google Drive sync is not configured. Set VITE_GOOGLE_CLIENT_ID and rebuild.",
    );
  }
  await loadGsiScript();
  if (!tokenClient) {
    tokenClient = window.google!.accounts!.oauth2.initTokenClient({
      client_id: clientId,
      scope: GDRIVE_SCOPES,
      callback: handleTokenResponse,
    });
  }
  return tokenClient;
}

let pendingResolve: ((response: TokenResponse) => void) | null = null;
let pendingReject: ((error: Error) => void) | null = null;

function handleTokenResponse(response: TokenResponse): void {
  if (response.error) {
    clearToken();
    pendingReject?.(
      new Error(
        response.error_description ?? `Sign-in failed: ${response.error}`,
      ),
    );
  } else {
    persistToken(response.access_token, response.expires_in);
    pendingResolve?.(response);
  }
  pendingResolve = null;
  pendingReject = null;
}

/**
 * Returns a usable access token, or null when not signed in. A stored token
 * within its expiry window is reused.
 */
export function getAccessToken(): string | null {
  loadStoredToken();
  // Refresh 60s before expiry to avoid failed requests at the boundary.
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;
  return null;
}

/** True when an access or refresh token is available. */
export function hasStoredAuth(): boolean {
  loadStoredToken();
  return accessToken !== null || refreshToken !== null;
}

/**
 * Ensures a usable access token exists, silently refreshing it when needed.
 * Returns null when there is nothing to refresh or refresh fails.
 */
export async function ensureAccessToken(): Promise<string | null> {
  const current = getAccessToken();
  if (current) return current;

  loadStoredToken();
  if (!refreshToken) return null;

  try {
    if (isTauriRuntime()) {
      const clientId = getClientId();
      if (!clientId) return null;
      const result = await invoke<{
        access_token: string;
        refresh_token?: string | null;
        expires_in: number;
      }>("drive_refresh", { refreshToken, clientId });
      persistToken(result.access_token, result.expires_in);
      if (result.refresh_token) persistRefreshToken(result.refresh_token);
      return result.access_token;
    }
    // Browser (GIS): attempt a silent re-auth using the existing session.
    const response = await requestAccessToken();
    return response.access_token;
  } catch {
    return null;
  }
}

async function signInTauri(): Promise<TokenResponse> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error(
      "Google Drive sync is not configured. Set VITE_GOOGLE_CLIENT_ID and rebuild.",
    );
  }
  const result = await invoke<{
    access_token: string;
    refresh_token?: string | null;
    expires_in: number;
  }>("drive_oauth", { clientId, scopes: GDRIVE_SCOPES });
  persistToken(result.access_token, result.expires_in);
  if (result.refresh_token) persistRefreshToken(result.refresh_token);
  return {
    access_token: result.access_token,
    token_type: "Bearer",
    expires_in: result.expires_in,
    scope: GDRIVE_SCOPES,
  };
}

/**
 * Requests an access token. On desktop this opens the system browser for the
 * Google consent screen; in the browser it uses the GIS popup (silent when the
 * user has already granted access).
 */
export async function requestAccessToken(): Promise<TokenResponse> {
  if (isTauriRuntime()) {
    return signInTauri();
  }
  const client = await initTokenClient();
  return new Promise<TokenResponse>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    client.requestAccessToken({ prompt: "" });
  });
}

/**
 * Fetches the signed-in user's profile and persists it locally.
 * Returns null when the request fails.
 */
export async function fetchUserInfo(): Promise<UserInfo | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    let info: UserInfo;
    if (isTauriRuntime()) {
      info = await invoke<UserInfo>("drive_userinfo", { accessToken: token });
    } else {
      const response = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      info = (await response.json()) as UserInfo;
    }
    persistUserInfo(info);
    return info;
  } catch {
    return null;
  }
}

/** Returns the last known user profile, if any. */
export function getStoredUserInfo(): UserInfo | null {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

function persistUserInfo(info: UserInfo): void {
  try {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore.
  }
}

/** Revokes the current token and clears all local auth state. */
export async function signOutFromGoogle(): Promise<void> {
  if (accessToken && !isTauriRuntime()) {
    try {
      await loadGsiScript();
      window.google?.accounts?.oauth2.revoke(accessToken, () => {});
    } catch {
      // Best-effort revocation.
    }
  }
  clearToken();
  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
