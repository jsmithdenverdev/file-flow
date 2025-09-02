import { Readable } from 'stream';

/**
 * Utility function to convert readable stream to buffer
 * Keeps this as a pure utility function - not part of domain abstractions
 */
export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const generateFileKey = (filename: string, prefix = 'uploads'): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${timestamp}-${randomId}-${sanitizedFilename}`;
};