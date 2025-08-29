import { Handler } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { s3Service, streamToBuffer } from '../shared/s3-utils';
import { logger } from '../shared/logger';
import { ExposureEvent, ExposureResult } from '../types';

interface ExposureProcessor {
  adjustExposure: (input: Buffer, adjustment: number) => Promise<Buffer>;
}

const exposureProcessor = (): ExposureProcessor => ({
  adjustExposure: async (
    input: Buffer,
    adjustment: number
  ): Promise<Buffer> => {
    // Clamp adjustment to safe range (-1 to 1)
    const safeAdjustment = Math.max(-1, Math.min(1, adjustment));

    logger.info('Adjusting exposure', { adjustment: safeAdjustment });

    // Convert adjustment to Sharp's parameters
    // For exposure adjustment, we'll use a combination of:
    // 1. Gamma correction (affects midtones)
    // 2. Brightness modulation (overall brightness)
    // 3. Contrast adjustment (to maintain detail)

    // Gamma: values < 1 brighten, > 1 darken
    // We use an exponential scale for more natural results
    const gamma = safeAdjustment >= 0
      ? 1 - (safeAdjustment * 0.5)  // Brightening: 1.0 to 0.5
      : 1 + Math.abs(safeAdjustment) * 0.8;  // Darkening: 1.0 to 1.8

    // Brightness: 1 is neutral, > 1 brightens, < 1 darkens
    const brightness = 1 + (safeAdjustment * 0.3);

    // Slight contrast adjustment to compensate for brightness changes
    const contrast = safeAdjustment >= 0
      ? 1 + (safeAdjustment * 0.1)  // Slight contrast increase when brightening
      : 1 - (Math.abs(safeAdjustment) * 0.1);  // Slight contrast decrease when darkening

    logger.debug('Exposure parameters', {
      gamma,
      brightness,
      contrast,
    });

    try {
      const processedBuffer = await sharp(input)
        .gamma(gamma)
        .modulate({
          brightness,
        })
        .linear(contrast, -(contrast - 1) * 128) // Contrast adjustment
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      logger.error('Sharp processing error', error);
      throw new Error(`Failed to adjust exposure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

const exposureHandler = (
  s3: ReturnType<typeof s3Service>,
  processor: ExposureProcessor
): Handler<ExposureEvent, ExposureResult> => async (event) => {
  logger.info('Processing exposure adjustment', {
    bucket: event.bucket,
    key: event.key,
    adjustment: event.adjustment,
  });

  try {
    // Download image
    const { Body, ContentType, Metadata } = await s3.getObject(
      event.bucket,
      event.key
    );

    if (!Body) {
      throw new Error(`No body returned for ${event.key}`);
    }

    const inputBuffer = await streamToBuffer(Body);
    logger.info('Downloaded image for exposure adjustment', {
      key: event.key,
      size: inputBuffer.length,
    });

    // Validate that we're processing an image
    const inputMetadata = await sharp(inputBuffer).metadata();
    if (!inputMetadata.width || !inputMetadata.height) {
      throw new Error('Invalid image data');
    }

    // Process image
    const outputBuffer = await processor.adjustExposure(
      inputBuffer,
      event.adjustment
    );

    // Generate output key
    // If processing a resized image, append exposure adjustment
    // Otherwise, create new processed path
    const outputKey = event.key.includes('processed/')
      ? event.key.replace(/\.[^.]+$/, '-exposure-adjusted.jpg')
      : event.key
          .replace('uploads/', 'processed/')
          .replace(/\.[^.]+$/, '-exposure-adjusted.jpg');

    // Get metadata of processed image
    const outputMetadata = await sharp(outputBuffer).metadata();

    // Upload processed image
    await s3.putObject(
      event.bucket,
      outputKey,
      outputBuffer,
      ContentType || 'image/jpeg',
      {
        ...Metadata,
        'processing-step': 'exposure-adjustment',
        'adjustment-value': event.adjustment.toString(),
        'dimensions': `${outputMetadata.width}x${outputMetadata.height}`,
        'processed-at': new Date().toISOString(),
      }
    );

    logger.info('Uploaded exposure-adjusted image', {
      outputKey,
      adjustment: event.adjustment,
      size: outputBuffer.length,
    });

    return {
      outputKey,
      adjustment: event.adjustment,
      fileSize: outputBuffer.length,
    };
  } catch (error) {
    logger.error('Error adjusting exposure', error, {
      bucket: event.bucket,
      key: event.key,
    });
    
    // Throw error to trigger retry in Step Functions
    throw error;
  }
};

// Lambda handler factory
export const handler = (): Handler<ExposureEvent, ExposureResult> => {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const s3 = s3Service(s3Client);
  const processor = exposureProcessor();

  return exposureHandler(s3, processor);
};

// Export for Lambda
export const lambdaHandler = handler();