import { Context } from 'aws-lambda';
import { lambdaHandler } from '../../src/handlers/validator';
import { ValidationEvent } from '../../src/types';

// Mock AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: mockSend,
  })),
  HeadObjectCommand: jest.fn(),
}));

describe('Validator Lambda Handler', () => {
  const mockContext = {} as Context;
  const mockCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789:stateMachine:test';
  });

  it('should validate a valid image file', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/test-image.jpg',
    };

    mockSend.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 1024 * 1024, // 1MB
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.isValid).toBe(true);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.size).toBe(1024 * 1024);
    expect(result.error).toBeUndefined();
  });

  it('should reject file with no content type', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/test-file',
    };

    mockSend.mockResolvedValue({
      ContentLength: 1024,
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File has no content type');
  });

  it('should reject non-image content types', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/document.pdf',
    };

    mockSend.mockResolvedValue({
      ContentType: 'application/pdf',
      ContentLength: 1024,
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid content type');
  });

  it('should reject oversized files', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/huge-image.jpg',
    };

    mockSend.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 30 * 1024 * 1024, // 30MB
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });

  it('should handle file not found error', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/non-existent.jpg',
    };

    const error = new Error('NoSuchKey');
    error.name = 'NoSuchKey';
    mockSend.mockRejectedValue(error);

    const result = await lambdaHandler(event, mockContext, mockCallback) as any;

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File not found');
  });

  it('should throw error for unexpected failures', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/test.jpg',
    };

    mockSend.mockRejectedValue(new Error('Network error'));

    await expect(lambdaHandler(event, mockContext, mockCallback))
      .rejects
      .toThrow('Validation failed: Network error');
  });

  it('should validate all allowed image types', async () => {
    const imageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    for (const contentType of imageTypes) {
      mockSend.mockResolvedValue({
        ContentType: contentType,
        ContentLength: 1024,
        Metadata: {},
      });

      const event: ValidationEvent = {
        bucket: 'test-bucket',
        key: `uploads/test.${contentType.split('/')[1]}`,
      };

      const result = await lambdaHandler(event, mockContext, mockCallback) as any;
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe(contentType);
    }
  });
});