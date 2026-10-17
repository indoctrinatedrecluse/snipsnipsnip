import type { EncryptedData } from "@/types/snippet";

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM CryptoKey from a user passphrase and a cryptographic salt using PBKDF2.
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    usage,
  );
}

/**
 * Encrypts plaintext string using AES-GCM-256 with PBKDF2 key derivation.
 */
export async function encryptSnippetContent(
  plainText: string,
  passphrase: string,
): Promise<EncryptedData> {
  if (!passphrase) {
    throw new Error("Passphrase cannot be empty");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt, ["encrypt"]);
  const enc = new TextEncoder();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainText),
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypts AES-GCM-256 ciphertext using user passphrase.
 * Throws an error if passphrase is wrong or data is corrupted.
 */
export async function decryptSnippetContent(
  encrypted: EncryptedData,
  passphrase: string,
): Promise<string> {
  if (!passphrase) {
    throw new Error("Passphrase cannot be empty");
  }

  const salt = new Uint8Array(base64ToArrayBuffer(encrypted.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv));
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

  const key = await deriveKey(passphrase, salt, ["decrypt"]);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error("Decryption failed. Incorrect passphrase or corrupted payload.");
  }
}
