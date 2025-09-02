import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { lambdaHandler } from '../../src/handlers/presigned-url';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.s3.amazonaws.com'),
}));

describe('Presigned URL Lambda Handler', () => {
  const mockContext = {} as Context;
  const mockCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789:stateMachine:test';
  });

  const createMockEvent = (body: object): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/upload/presign',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  it('should generate presigned URL for valid request', async () => {
    const event = createMockEvent({
      filename: 'test-image.jpg',
      contentType: 'image/jpeg',
      fileSize: 1024 * 1024, // 1MB
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('uploadUrl');
    expect(body).toHaveProperty('key');
    expect(body).toHaveProperty('expiresAt');
    expect(body.uploadUrl).toBe('https://mock-signed-url.s3.amazonaws.com');
  });

  it('should reject request with missing fields', async () => {
    const event = createMockEvent({
      filename: 'test-image.jpg',
      // Missing contentType and fileSize
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Missing required fields');
  });

  it('should reject invalid content type', async () => {
    const event = createMockEvent({
      filename: 'test-file.txt',
      contentType: 'text/plain',
      fileSize: 1024,
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Invalid content type');
  });

  it('should reject oversized files', async () => {
    const event = createMockEvent({
      filename: 'huge-image.jpg',
      contentType: 'image/jpeg',
      fileSize: 30 * 1024 * 1024, // 30MB
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('File size exceeds maximum');
  });

  it('should handle invalid JSON in request body', async () => {
    const event = createMockEvent({} as any);
    event.body = 'invalid json';

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal server error');
  });

  it('should support all allowed image types', async () => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const contentType of imageTypes) {
      const event = createMockEvent({
        filename: 'test-image',
        contentType,
        fileSize: 1024,
      });

      const result = await lambdaHandler(event, mockContext, mockCallback) as any;
      expect(result.statusCode).toBe(200);
    }
  });
});