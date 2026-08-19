import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

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

  describe("Tauri runtime", () => {
    beforeEach(() => {
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        value: {},
      });
      mocks.invoke.mockReset();
    });

    afterEach(() => {
      delete (window as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__;
    });

    it("signs in through the Rust backend and stores the tokens", async () => {
      mocks.invoke.mockResolvedValueOnce({
        access_token: "desktop-token",
        refresh_token: "refresh-1",
        expires_in: 3600,
      });

      const response = await auth.requestAccessToken();

      expect(response.access_token).toBe("desktop-token");
      expect(auth.getAccessToken()).toBe("desktop-token");
      expect(mocks.invoke).toHaveBeenCalledWith(
        "drive_oauth",
        expect.objectContaining({
          scopes: expect.stringContaining("drive.appdata"),
        }),
      );
    });

    it("silently refreshes an expired token with the stored refresh token", async () => {
      window.localStorage.setItem(
        "snippetvault-gdrive-token",
        JSON.stringify({ token: "expired", expiry: Date.now() - 1000 }),
      );
      window.localStorage.setItem(
        "snippetvault-gdrive-refresh",
        "refresh-1",
      );
      mocks.invoke.mockResolvedValueOnce({
        access_token: "fresh-token",
        refresh_token: null,
        expires_in: 3600,
      });

      const token = await auth.ensureAccessToken();

      expect(token).toBe("fresh-token");
      expect(auth.getAccessToken()).toBe("fresh-token");
      expect(mocks.invoke).toHaveBeenCalledWith(
        "drive_refresh",
        expect.objectContaining({ refreshToken: "refresh-1" }),
      );
    });

    it("fetches and persists the user profile", async () => {
      mocks.invoke.mockResolvedValueOnce({
        access_token: "desktop-token",
        refresh_token: "refresh-1",
        expires_in: 3600,
      });
      await auth.requestAccessToken();

      mocks.invoke.mockResolvedValueOnce({
        sub: "123",
        name: "Test User",
        email: "user@example.com",
        picture: "https://example.com/avatar.png",
      });

      const user = await auth.fetchUserInfo();

      expect(user?.name).toBe("Test User");
      expect(auth.getStoredUserInfo()?.email).toBe("user@example.com");
      expect(mocks.invoke).toHaveBeenCalledWith(
        "drive_userinfo",
        expect.objectContaining({ accessToken: "desktop-token" }),
      );
    });
  });
});
