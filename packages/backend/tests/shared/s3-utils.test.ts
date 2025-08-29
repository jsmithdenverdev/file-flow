import { Readable } from 'stream';
import { S3Client } from '@aws-sdk/client-s3';
import { 
  streamToBuffer, 
  s3Service, 
  generateFileKey 
} from '../../src/shared/s3-utils';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.s3.amazonaws.com'),
}));

describe('S3 Utils', () => {
  describe('streamToBuffer', () => {
    it('should convert readable stream to buffer', async () => {
      const testData = 'Hello, World!';
      const stream = Readable.from([testData]);
      
      const buffer = await streamToBuffer(stream);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe(testData);
    });

    it('should handle empty stream', async () => {
      const stream = Readable.from([]);
      
      const buffer = await streamToBuffer(stream);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(0);
    });

    it('should concatenate multiple chunks', async () => {
      const chunks = ['Hello', ', ', 'World', '!'];
      const stream = Readable.from(chunks);
      
      const buffer = await streamToBuffer(stream);
      
      expect(buffer.toString()).toBe('Hello, World!');
    });
  });

  describe('generateFileKey', () => {
    it('should generate unique keys with default prefix', () => {
      const filename = 'test-image.jpg';
      
      const key1 = generateFileKey(filename);
      const key2 = generateFileKey(filename);
      
      expect(key1).toMatch(/^uploads\/\d+-[a-z0-9]+-test-image\.jpg$/);
      expect(key2).toMatch(/^uploads\/\d+-[a-z0-9]+-test-image\.jpg$/);
      expect(key1).not.toBe(key2); // Should be unique
    });

    it('should use custom prefix', () => {
      const filename = 'test-image.jpg';
      const prefix = 'custom-folder';
      
      const key = generateFileKey(filename, prefix);
      
      expect(key).toMatch(/^custom-folder\/\d+-[a-z0-9]+-test-image\.jpg$/);
    });

    it('should sanitize filename with special characters', () => {
      const filename = 'test image@#$%.jpg';
      
      const key = generateFileKey(filename);
      
      expect(key).toMatch(/^uploads\/\d+-[a-z0-9]+-test_image____.jpg$/);
      expect(key).not.toContain('@');
      expect(key).not.toContain('#');
      expect(key).not.toContain('$');
      expect(key).not.toContain('%');
    });

    it('should preserve allowed characters', () => {
      const filename = 'test-image_123.file-name.jpg';
      
      const key = generateFileKey(filename);
      
      expect(key).toMatch(/test-image_123\.file-name\.jpg$/);
    });
  });

  describe('s3Service', () => {
    let s3Client: S3Client;
    let s3: ReturnType<typeof s3Service>;
    let mockSend: jest.Mock;

    beforeEach(() => {
      mockSend = jest.fn();
      s3Client = new S3Client({});
      s3Client.send = mockSend;
      s3 = s3Service(s3Client);
    });

    describe('getObject', () => {
      it('should get object from S3', async () => {
        const mockStream = Readable.from(['test data']);
        mockSend.mockResolvedValue({
          Body: mockStream,
          ContentType: 'image/jpeg',
          Metadata: { key: 'value' },
        });

        const result = await s3.getObject('bucket', 'key');

        expect(result.Body).toBe(mockStream);
        expect(result.ContentType).toBe('image/jpeg');
        expect(result.Metadata).toEqual({ key: 'value' });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });

    describe('putObject', () => {
      it('should put object to S3', async () => {
        mockSend.mockResolvedValue({});

        await s3.putObject(
          'bucket',
          'key',
          Buffer.from('test data'),
          'image/jpeg',
          { key: 'value' }
        );

        expect(mockSend).toHaveBeenCalledTimes(1);
        const command = mockSend.mock.calls[0][0];
        expect(command.input).toMatchObject({
          Bucket: 'bucket',
          Key: 'key',
          ContentType: 'image/jpeg',
          Metadata: { key: 'value' },
        });
      });
    });

    describe('headObject', () => {
      it('should get object metadata from S3', async () => {
        mockSend.mockResolvedValue({
          ContentType: 'image/jpeg',
          ContentLength: 1024,
          Metadata: { key: 'value' },
        });

        const result = await s3.headObject('bucket', 'key');

        expect(result.ContentType).toBe('image/jpeg');
        expect(result.ContentLength).toBe(1024);
        expect(result.Metadata).toEqual({ key: 'value' });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });

    describe('getPresignedUrl', () => {
      it('should generate presigned URL', async () => {
        const url = await s3.getPresignedUrl(
          'bucket',
          'key',
          'image/jpeg',
          1024,
          3600
        );

        expect(url).toBe('https://mock-signed-url.s3.amazonaws.com');
      });
    });
  });
});