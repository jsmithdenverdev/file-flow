import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateFileKey } from '../aws/s3';
import { logger } from '../logging';
import { config } from '../config';
import {
  UploadRequest,
  UploadResponse,
  MAX_FILE_SIZE,
  isAllowedContentType,
  ALLOWED_CONTENT_TYPES,
} from '../types';

const presignedUrlHandler = (
  bucket: string,
  s3Client: Pick<S3Client, 'send'>
) => async (event: import('aws-lambda').APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    // Generate presigned URL using AWS SDK directly
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
      ContentLength: body.fileSize,
      Metadata: {
        'original-filename': body.filename,
        'upload-timestamp': new Date().toISOString(),
      },
    });
    
    const uploadUrl = await getSignedUrl(s3Client as S3Client, command, {
      expiresIn: 3600, // 1 hour expiration
    });

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

// Direct handler export with full dependency construction
export const lambdaHandler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  // Construct entire dependency graph here
  const { bucketName, awsRegion } = config();
  
  const s3Client = new S3Client({ region: awsRegion });
  
  // Call the actual handler logic directly
  const handler = presignedUrlHandler(bucketName, s3Client);
  return handler(event);
};