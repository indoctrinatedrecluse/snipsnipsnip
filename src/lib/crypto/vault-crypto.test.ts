import { describe, expect, it } from "vitest";
import { encryptSnippetContent, decryptSnippetContent } from "./vault-crypto";

describe("vault-crypto", () => {
  it("encrypts and decrypts secret snippet content round-trip", async () => {
    const secretCode = "export const AWS_SECRET_KEY = 'AKIA123456789';";
    const passphrase = "correct-horse-battery-staple";

    const encrypted = await encryptSnippetContent(secretCode, passphrase);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(secretCode);

    const decrypted = await decryptSnippetContent(encrypted, passphrase);
    expect(decrypted).toBe(secretCode);
  });

  it("throws error when decrypting with incorrect passphrase", async () => {
    const secretCode = "TOP_SECRET_TOKEN_999";
    const encrypted = await encryptSnippetContent(secretCode, "password123");

    await expect(
      decryptSnippetContent(encrypted, "wrong-password"),
    ).rejects.toThrow("Decryption failed. Incorrect passphrase or corrupted payload.");
  });

  it("rejects empty passphrases", async () => {
    await expect(encryptSnippetContent("hello", "")).rejects.toThrow("Passphrase cannot be empty");
    await expect(
      decryptSnippetContent({ ciphertext: "", iv: "", salt: "" }, ""),
    ).rejects.toThrow("Passphrase cannot be empty");
  });
});
