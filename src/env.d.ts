/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly NG_APP_API_URL?: string;
    readonly NG_APP_PRODUCTION?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
