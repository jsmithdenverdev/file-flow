/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_S3_BUCKET_NAME: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_NODE_ENV: string;
  readonly VITE_ENABLE_DEBUG_LOGGING: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}