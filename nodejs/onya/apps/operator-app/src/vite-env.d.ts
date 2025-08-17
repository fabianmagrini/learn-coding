/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPERATOR_BFF_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}