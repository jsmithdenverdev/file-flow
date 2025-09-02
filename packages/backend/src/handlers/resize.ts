import { Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { streamToBuffer } from '../aws/s3';
import { Readable } from 'stream';
import { logger } from '../logging';
import { config } from '../config';
import { ResizeEvent, ResizeResult } from '../types';

interface ImageProcessor {
  resize: (
    input: Buffer,
    width?: number,
    height?: number,
    maintainAspectRatio?: boolean
  ) => Promise<{ buffer: Buffer; metadata: sharp.Metadata }>;
}

const imageProcessor = (): ImageProcessor => ({
  resize: async (
    input: Buffer,
    width?: number,
    height?: number,
    maintainAspectRatio = true
  ): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> => {
    const image = sharp(input);
    const metadata = await image.metadata();

    // Calculate dimensions
    let targetWidth = width || metadata.width || 1920;
    let targetHeight = height || metadata.height || 1080;

    // Maintain aspect ratio if requested
    if (maintainAspectRatio && metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      
      if (width && !height) {
        targetHeight = Math.round(width / aspectRatio);
      } else if (height && !width) {
        targetWidth = Math.round(height * aspectRatio);
      } else if (width && height) {
        // Use 'inside' fit to maintain aspect ratio within bounds
        const widthRatio = width / metadata.width;
        const heightRatio = height / metadata.height;
        const ratio = Math.min(widthRatio, heightRatio);
        targetWidth = Math.round(metadata.width * ratio);
        targetHeight = Math.round(metadata.height * ratio);
      }
    }

    logger.info('Resizing image', {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      targetWidth,
      targetHeight,
      maintainAspectRatio,
    });

    const buffer = await image
      .resize(targetWidth, targetHeight, {
        fit: maintainAspectRatio ? 'inside' : 'fill',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3, // High quality resizing
      })
      .jpeg({
        quality: 90,
        progressive: true,
        mozjpeg: true, // Better compression
      })
      .toBuffer();

    const outputMetadata = await sharp(buffer).metadata();

    return { buffer, metadata: outputMetadata };
  },
});

const resizeHandler = (
  s3Client: Pick<S3Client, 'send'>,
  processor: ImageProcessor
) => async (event: ResizeEvent): Promise<ResizeResult> => {
  logger.info('Processing resize request', {
    bucket: event.bucket,
    key: event.key,
    width: event.width,
    height: event.height,
  });

  try {
    // Download original image
    const getCommand = new GetObjectCommand({
      Bucket: event.bucket,
      Key: event.key,
    });
    const response: any = await s3Client.send(getCommand);
    const { Body, Metadata } = response;

    if (!Body) {
      throw new Error(`No body returned for ${event.key}`);
    }

    const inputBuffer = await streamToBuffer(Body as Readable);
    logger.info('Downloaded image', {
      key: event.key,
      size: inputBuffer.length,
    });

    // Process image
    const { buffer: outputBuffer, metadata } = await processor.resize(
      inputBuffer,
      event.width,
      event.height,
      event.maintainAspectRatio
    );

    // Generate output key
    const outputKey = event.key
      .replace('uploads/', 'processed/')
      .replace(
        /\.[^.]+$/,
        `-resized-${metadata.width}x${metadata.height}.jpg`
      );

    // Upload processed image
    const putCommand = new PutObjectCommand({
      Bucket: event.bucket,
      Key: outputKey,
      Body: outputBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        ...Metadata,
        'processing-step': 'resize',
        'original-key': event.key,
        'dimensions': `${metadata.width}x${metadata.height}`,
        'processed-at': new Date().toISOString(),
      },
    });
    await s3Client.send(putCommand);

    logger.info('Uploaded resized image', {
      outputKey,
      dimensions: `${metadata.width}x${metadata.height}`,
      size: outputBuffer.length,
    });

    return {
      outputKey,
      dimensions: {
        width: metadata.width || 0,
        height: metadata.height || 0,
      },
      fileSize: outputBuffer.length,
    };
  } catch (error) {
    logger.error('Error processing image', error, {
      bucket: event.bucket,
      key: event.key,
    });
    
    // Throw error to trigger retry in Step Functions
    throw error;
  }
};

// Direct handler export with full dependency construction
export const lambdaHandler: Handler<ResizeEvent, ResizeResult> = async (event): Promise<ResizeResult> => {
  // Construct entire dependency graph here
  const { awsRegion } = config();
  
  const s3Client = new S3Client({ region: awsRegion });
  const processor = imageProcessor();
  
  // Call the actual handler logic directly
  const handler = resizeHandler(s3Client, processor);
  return handler(event);
};