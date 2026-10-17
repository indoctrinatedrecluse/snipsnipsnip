import { beforeEach, describe, expect, it } from "vitest";
import {
  saveSecureSecret,
  loadSecureSecret,
  clearAllSecureSecrets,
  maskApiKey,
  redactSensitiveData,
} from "./secure-storage";

describe("secure-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("encrypts secrets so raw plaintext is never stored in localStorage", async () => {
    const rawKey = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";
    await saveSecureSecret("openai", rawKey);

    // Verify localStorage has encrypted payload, not raw plaintext
    const stored = localStorage.getItem("sv_sec_openai");
    expect(stored).not.toBeNull();
    expect(stored).not.toContain(rawKey);
    expect(stored).toContain("iv");
    expect(stored).toContain("data");

    // Decrypts accurately
    const loaded = await loadSecureSecret("openai");
    expect(loaded).toBe(rawKey);
  });

  it("clears all secure secrets", async () => {
    await saveSecureSecret("gemini", "key-1");
    await saveSecureSecret("claude", "key-2");

    clearAllSecureSecrets();

    expect(await loadSecureSecret("gemini")).toBe("");
    expect(await loadSecureSecret("claude")).toBe("");
  });

  it("masks API keys properly for UI display", () => {
    expect(maskApiKey("")).toBe("");
    expect(maskApiKey("short")).toBe("••••••••");
    expect(maskApiKey("sk-ant-api03-123456789abcdef")).toMatch(/•+cdef$/);
  });

  it("redacts sensitive keys from error messages", () => {
    const errorMsg = "Failed request with key=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 and Authorization: Bearer sk-ant-secret1234567890abcdef";
    const redacted = redactSensitiveData(errorMsg);
    expect(redacted).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6");
    expect(redacted).not.toContain("sk-ant-secret1234567890abcdef");
    expect(redacted).toContain("[REDACTED]");
  });
});
