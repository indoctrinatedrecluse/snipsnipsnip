import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TokenCallback = (response: TokenResponse) => void;

let configCallback: TokenCallback | null = null;
let nextResponse: TokenResponse = { access_token: "tok-123", expires_in: 3600 };

function installGoogleStub() {
  Object.defineProperty(window, "google", {
    configurable: true,
    value: {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: TokenCallback }) => {
            configCallback = config.callback;
            return {
              requestAccessToken: () => {
                // Simulate GIS delivering the response on the next tick.
                setTimeout(() => configCallback?.(nextResponse), 0);
              },
            };
          },
          revoke: (_token: string, done?: () => void) => done?.(),
        },
      },
    },
  });
}

describe("gdrive-auth", () => {
  let auth: typeof import("@/lib/gdrive-auth");

  beforeEach(async () => {
    // Reset the module so the cached token client doesn't leak between tests.
    vi.resetModules();
    auth = await import("@/lib/gdrive-auth");

    vi.stubEnv(
      "VITE_GOOGLE_CLIENT_ID",
      "test-client-id.apps.googleusercontent.com",
    );
    installGoogleStub();
    window.localStorage.clear();
    nextResponse = { access_token: "tok-123", expires_in: 3600 };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as { google?: unknown }).google;
    configCallback = null;
    window.localStorage.clear();
  });

  it("reads the client id from the environment", () => {
    expect(auth.getClientId()).toBe(
      "test-client-id.apps.googleusercontent.com",
    );
  });

  it("resolves the token request and stores the access token", async () => {
    const response = await auth.requestAccessToken();
    expect(response.access_token).toBe("tok-123");
    expect(auth.getAccessToken()).toBe("tok-123");
  });

  it("rejects when Google reports an error", async () => {
    nextResponse = {
      error: "access_denied",
      error_description: "The user denied access",
    };
    await expect(auth.requestAccessToken()).rejects.toThrow(/denied access/);
    expect(auth.getAccessToken()).toBeNull();
  });

  it("clears the token on sign out", async () => {
    await auth.requestAccessToken();
    expect(auth.getAccessToken()).toBe("tok-123");

    await auth.signOutFromGoogle();
    expect(auth.getAccessToken()).toBeNull();
  });
});
