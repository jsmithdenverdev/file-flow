import { Readable } from 'stream';
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export interface S3Service {
  getObject: (bucket: string, key: string) => Promise<{
    Body?: Readable;
    ContentType?: string;
    Metadata?: Record<string, string>;
  }>;
  putObject: (
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>
  ) => Promise<void>;
  headObject: (bucket: string, key: string) => Promise<{
    ContentType?: string;
    ContentLength?: number;
    Metadata?: Record<string, string>;
  }>;
  getPresignedUrl: (
    bucket: string,
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn?: number
  ) => Promise<string>;
}

export const s3Service = (client: S3Client): S3Service => ({
  getObject: async (bucket: string, key: string) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);
    return {
      Body: response.Body as Readable,
      ContentType: response.ContentType,
      Metadata: response.Metadata,
    };
  },

  putObject: async (
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>
  ) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    });
    await client.send(command);
  },

  headObject: async (bucket: string, key: string) => {
    const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);
    return {
      ContentType: response.ContentType,
      ContentLength: response.ContentLength,
      Metadata: response.Metadata,
    };
  },

  getPresignedUrl: async (
    bucket: string,
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn = 3600
  ) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });
    return getSignedUrl(client, command, { expiresIn });
  },
});

export const generateFileKey = (filename: string, prefix = 'uploads'): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${timestamp}-${randomId}-${sanitizedFilename}`;
};