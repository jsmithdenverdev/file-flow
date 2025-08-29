import { Handler } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { s3Service } from '../shared/s3-utils';
import { logger } from '../shared/logger';
import { config } from '../config';
import {
  ValidationEvent,
  ValidationResult,
  MAX_FILE_SIZE,
  isAllowedContentType,
} from '../types';

const validatorHandler = (
  s3: ReturnType<typeof s3Service>
) => async (event: ValidationEvent): Promise<ValidationResult> => {
  logger.info('Validating file', { 
    bucket: event.bucket, 
    key: event.key 
  });

  try {
    // Check if object exists and get metadata
    const metadata = await s3.headObject(event.bucket, event.key);

    if (!metadata.ContentType) {
      logger.warn('File has no content type', { key: event.key });
      return {
        isValid: false,
        error: 'File has no content type',
      };
    }

    if (!isAllowedContentType(metadata.ContentType)) {
      logger.warn('Invalid content type', { 
        key: event.key, 
        contentType: metadata.ContentType 
      });
      return {
        isValid: false,
        contentType: metadata.ContentType,
        error: `Invalid content type: ${metadata.ContentType}`,
      };
    }

    if (metadata.ContentLength && metadata.ContentLength > MAX_FILE_SIZE) {
      logger.warn('File size exceeds maximum', { 
        key: event.key, 
        size: metadata.ContentLength,
        maxSize: MAX_FILE_SIZE 
      });
      return {
        isValid: false,
        contentType: metadata.ContentType,
        size: metadata.ContentLength,
        error: `File size (${metadata.ContentLength}) exceeds maximum (${MAX_FILE_SIZE})`,
      };
    }

    // Additional validation: Check if it's actually an image by attempting to get metadata
    // This could be enhanced with actual image validation using Sharp
    if (!metadata.ContentType.startsWith('image/')) {
      logger.warn('File is not an image', { 
        key: event.key, 
        contentType: metadata.ContentType 
      });
      return {
        isValid: false,
        contentType: metadata.ContentType,
        error: 'File is not a valid image',
      };
    }

    logger.info('File validation successful', { 
      key: event.key,
      contentType: metadata.ContentType,
      size: metadata.ContentLength 
    });

    return {
      isValid: true,
      contentType: metadata.ContentType,
      size: metadata.ContentLength,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      logger.error('File not found', error, { key: event.key });
      return {
        isValid: false,
        error: 'File not found',
      };
    }

    logger.error('Error validating file', error, { key: event.key });
    
    // Throw error to trigger retry in Step Functions
    throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Direct handler export with full dependency construction
export const lambdaHandler: Handler<ValidationEvent, ValidationResult> = async (event): Promise<ValidationResult> => {
  // Construct entire dependency graph here
  const { awsRegion } = config();
  
  const s3Client = new S3Client({ region: awsRegion });
  const s3 = s3Service(s3Client);
  
  // Call the actual handler logic directly
  const handler = validatorHandler(s3);
  return handler(event);
};