import { z } from 'zod';

// Upload request schema
export const UploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().min(1).max(25 * 1024 * 1024), // 25MB max
});

export type UploadRequest = z.infer<typeof UploadRequestSchema>;

// Upload response schema
export const UploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string().min(1),
  expiresAt: z.string(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// File processing status
export const FileStatusSchema = z.enum([
  'pending',
  'uploading', 
  'processing',
  'completed',
  'failed'
]);

export type FileStatus = z.infer<typeof FileStatusSchema>;

// Processed file info
export const ProcessedFileSchema = z.object({
  key: z.string(),
  url: z.string().optional(),
  size: z.number().optional(),
  type: z.enum(['original', 'resized', 'adjusted']),
});

export type ProcessedFile = z.infer<typeof ProcessedFileSchema>;

// File item for UI
export const FileItemSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  key: z.string(),
  contentType: z.string(),
  size: z.number(),
  status: FileStatusSchema,
  uploadedAt: z.string(),
  processedFiles: z.array(ProcessedFileSchema).optional(),
  error: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
});

export type FileItem = z.infer<typeof FileItemSchema>;

// API error response
export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Step Functions execution result
export const ProcessingResultSchema = z.object({
  status: z.enum(['success', 'failed']),
  originalKey: z.string(),
  processedFiles: z.object({
    resized: z.string().optional(),
    adjusted: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
  completedAt: z.string().optional(),
  failedAt: z.string().optional(),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;