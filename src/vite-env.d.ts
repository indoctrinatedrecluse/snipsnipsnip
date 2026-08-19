/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth client id for Google Identity Services (Drive sync). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
