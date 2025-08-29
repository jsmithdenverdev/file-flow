import { Context } from 'aws-lambda';
import { handler } from '../../src/handlers/validator';
import { ValidationEvent } from '../../src/types';

// Mock S3 service
const mockHeadObject = jest.fn();
jest.mock('../../src/shared/s3-utils', () => ({
  s3Service: jest.fn(() => ({
    headObject: mockHeadObject,
  })),
}));

describe('Validator Lambda Handler', () => {
  let lambdaHandler: ReturnType<typeof handler>;
  const mockContext = {} as Context;
  const mockCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    lambdaHandler = handler();
  });

  it('should validate a valid image file', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/test-image.jpg',
    };

    mockHeadObject.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 1024 * 1024, // 1MB
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback);

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

    mockHeadObject.mockResolvedValue({
      ContentLength: 1024,
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File has no content type');
  });

  it('should reject non-image content types', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/document.pdf',
    };

    mockHeadObject.mockResolvedValue({
      ContentType: 'application/pdf',
      ContentLength: 1024,
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid content type');
  });

  it('should reject oversized files', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/huge-image.jpg',
    };

    mockHeadObject.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 30 * 1024 * 1024, // 30MB
      Metadata: {},
    });

    const result = await lambdaHandler(event, mockContext, mockCallback);

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
    mockHeadObject.mockRejectedValue(error);

    const result = await lambdaHandler(event, mockContext, mockCallback);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File not found');
  });

  it('should throw error for unexpected failures', async () => {
    const event: ValidationEvent = {
      bucket: 'test-bucket',
      key: 'uploads/test.jpg',
    };

    mockHeadObject.mockRejectedValue(new Error('Network error'));

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
      mockHeadObject.mockResolvedValue({
        ContentType: contentType,
        ContentLength: 1024,
        Metadata: {},
      });

      const event: ValidationEvent = {
        bucket: 'test-bucket',
        key: `uploads/test.${contentType.split('/')[1]}`,
      };

      const result = await lambdaHandler(event, mockContext, mockCallback);
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe(contentType);
    }
  });
});