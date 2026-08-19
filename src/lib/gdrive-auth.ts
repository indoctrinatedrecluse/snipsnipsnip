/**
 * Google Drive authentication via Google Identity Services (GIS).
 *
 * Uses a client-side OAuth token flow — no backend required. Tokens are
 * persisted to localStorage (with expiry) so reloads can reuse them until
 * they expire, at which point a silent refresh is attempted.
 */

export const GDRIVE_SCOPES = "https://www.googleapis.com/auth/drive.appdata";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const TOKEN_STORAGE_KEY = "snippetvault-gdrive-token";

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

/** Reads the OAuth client id from the environment (VITE_GOOGLE_CLIENT_ID). */
export function getClientId(): string | null {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null;
}

let scriptPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

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
    if (!raw) return;
    const parsed = JSON.parse(raw) as { token: string; expiry: number };
    if (parsed.expiry > Date.now()) {
      accessToken = parsed.token;
      tokenExpiry = parsed.expiry;
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
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

function clearToken(): void {
  accessToken = null;
  tokenExpiry = 0;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
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

/**
 * Requests an access token. Uses the silent flow when possible (the user
 * already granted access); otherwise Google shows the consent UI. Resolves
 * via whichever GIS callback fires (config or override).
 */
export async function requestAccessToken(): Promise<TokenResponse> {
  const client = await initTokenClient();
  return new Promise<TokenResponse>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    client.requestAccessToken({ prompt: "" });
  });
}

/** Revokes the current token and clears local auth state. */
export async function signOutFromGoogle(): Promise<void> {
  if (accessToken) {
    try {
      await loadGsiScript();
      window.google?.accounts?.oauth2.revoke(accessToken, () => {});
    } catch {
      // Best-effort revocation.
    }
  }
  clearToken();
}
