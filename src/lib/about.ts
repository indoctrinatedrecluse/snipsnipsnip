/**
 * About/app metadata.
 *
 * Author profile URLs are stored base64-encoded and decoded only at runtime,
 * so the raw addresses never appear as plain text in the UI or bundle.
 */

export const APP_NAME = "SnippetVault";
export const APP_VERSION = "0.1.0";
export const APP_DESCRIPTION =
  "A modern, privacy-focused, cloud-synchronized code snippet manager.";

export const AUTHOR = "indoctrinatedrecluse";
export const AUTHOR_ROLE = "Author";

// base64("https://github.com/indoctrinatedrecluse")
const GITHUB_URL_ENCODED = "aHR0cHM6Ly9naXRodWIuY29tL2luZG9jdHJpbmF0ZWRyZWNsdXNl";
// base64("https://portfolio-flutter-78bcf.web.app/")
const PORTFOLIO_URL_ENCODED =
  "aHR0cHM6Ly9wb3J0Zm9saW8tZmx1dHRlci03OGJjZi53ZWIuYXBwLw==";

function decodeUrl(encoded: string): string {
  return atob(encoded);
}

export function githubUrl(): string {
  return decodeUrl(GITHUB_URL_ENCODED);
}

export function portfolioUrl(): string {
  return decodeUrl(PORTFOLIO_URL_ENCODED);
}
