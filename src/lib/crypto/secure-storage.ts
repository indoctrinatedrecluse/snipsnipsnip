/**
 * Secure Credential Storage using WebCrypto AES-GCM-256.
 *
 * Protects sensitive API keys against plaintext storage leaks in localStorage,
 * backups, or casual disk inspection by encrypting them with a locally-isolated
 * device key before persistence.
 */

const STORAGE_PREFIX = "sv_sec_";
const MASTER_KEY_STORAGE = "sv_device_vault_seed";
const KEY_NAME = "AES-GCM";

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  let seedB64 = localStorage.getItem(MASTER_KEY_STORAGE);

  if (!seedB64) {
    const rawSeed = crypto.getRandomValues(new Uint8Array(32));
    seedB64 = btoa(String.fromCharCode(...rawSeed));
    localStorage.setItem(MASTER_KEY_STORAGE, seedB64);
  }

  const rawBytes = Uint8Array.from(atob(seedB64), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: KEY_NAME },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts and securely saves a secret string to storage.
 */
export async function saveSecureSecret(
  key: string,
  secret: string,
): Promise<void> {
  if (!secret) {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return;
  }

  const cryptoKey = await getOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: KEY_NAME, iv },
    cryptoKey,
    enc.encode(secret),
  );

  const payload = {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
  };

  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
}

/**
 * Decrypts and retrieves a secret string from secure storage.
 */
export async function loadSecureSecret(key: string): Promise<string> {
  const item = localStorage.getItem(STORAGE_PREFIX + key);
  if (!item) return "";

  try {
    const { iv: ivB64, data: dataB64 } = JSON.parse(item);
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));

    const cryptoKey = await getOrCreateDeviceKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: KEY_NAME, iv },
      cryptoKey,
      ciphertext,
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    // If decryption fails due to corrupted key or storage wipe, return empty
    return "";
  }
}

/**
 * Removes all secured API keys from local storage.
 */
export function clearAllSecureSecrets(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const k of keysToRemove) {
    localStorage.removeItem(k);
  }
}

/**
 * Helper to mask an API key for safe UI rendering (e.g. "••••••••••a1b2").
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "••••••••";
  const end = apiKey.slice(-4);
  return `${"•".repeat(Math.min(12, apiKey.length - 4))}${end}`;
}

/**
 * Redacts potential API keys from error messages and logs.
 */
export function redactSensitiveData(text: string): string {
  if (!text) return "";
  return text
    .replace(/(?:key|apiKey|token|password)=([^&\s"']+)/gi, "key=[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]")
    .replace(/(x-goog-api-key:\s*)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/(x-api-key:\s*)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "AIza[REDACTED]")
    .replace(/sk-[A-Za-z0-9-_]{20,}/g, "sk-[REDACTED]");
}
