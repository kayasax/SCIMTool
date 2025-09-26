/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_SCIM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}