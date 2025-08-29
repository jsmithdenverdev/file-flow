import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { s3Service, generateFileKey, S3Service } from '../shared/s3-utils';
import { logger } from '../shared/logger';
import {
  UploadRequest,
  UploadResponse,
  MAX_FILE_SIZE,
  isAllowedContentType,
  ALLOWED_CONTENT_TYPES,
} from '../types';

const presignedUrlHandler = (
  bucket: string,
  s3: S3Service
): APIGatewayProxyHandler => async (event): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Presigned URL request received', {
      headers: event.headers,
      path: event.path,
    });

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}') as UploadRequest;

    // Validation
    if (!body.filename || !body.contentType || !body.fileSize) {
      logger.warn('Missing required fields in request', { body });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required fields: filename, contentType, fileSize',
        }),
      };
    }

    if (!isAllowedContentType(body.contentType)) {
      logger.warn('Invalid content type', { contentType: body.contentType });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
        }),
      };
    }

    if (body.fileSize > MAX_FILE_SIZE) {
      logger.warn('File size exceeds maximum', { 
        fileSize: body.fileSize, 
        maxSize: MAX_FILE_SIZE 
      });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
      };
    }

    // Generate unique key for the file
    const key = generateFileKey(body.filename);

    // Generate presigned URL
    const uploadUrl = await s3.getPresignedUrl(
      bucket,
      key,
      body.contentType,
      body.fileSize,
      3600 // 1 hour expiration
    );

    const response: UploadResponse = {
      uploadUrl,
      key,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    logger.info('Presigned URL generated successfully', { 
      key, 
      contentType: body.contentType,
      fileSize: body.fileSize 
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error('Error generating presigned URL', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Lambda handler factory
export const handler = (): APIGatewayProxyHandler => {
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error('BUCKET_NAME environment variable is required');
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const s3 = s3Service(s3Client);

  return presignedUrlHandler(bucket, s3);
};

// Export for Lambda
export const lambdaHandler = handler();