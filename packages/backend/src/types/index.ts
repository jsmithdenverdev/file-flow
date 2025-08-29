export interface UploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface UploadResponse {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

export interface ProcessingInput {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface ResizeEvent {
  bucket: string;
  key: string;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}

export interface ResizeResult {
  outputKey: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
}

export interface ExposureEvent {
  bucket: string;
  key: string;
  adjustment: number; // -1 to 1, where 0 is no change
}

export interface ExposureResult {
  outputKey: string;
  adjustment: number;
  fileSize: number;
}

export interface ValidationEvent {
  bucket: string;
  key: string;
}

export interface ValidationResult {
  isValid: boolean;
  contentType?: string;
  size?: number;
  error?: string;
}

export type ProcessingResult =
  | { status: 'success'; outputKey: string; metadata?: Record<string, any> }
  | { status: 'error'; error: string }
  | { status: 'retry'; reason: string };

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for 4K images

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedContentType = typeof ALLOWED_CONTENT_TYPES[number];

export const isAllowedContentType = (type: string): type is AllowedContentType =>
  ALLOWED_CONTENT_TYPES.includes(type as AllowedContentType);