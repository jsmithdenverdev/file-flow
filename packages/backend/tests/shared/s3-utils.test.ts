import { Readable } from 'stream';
import { 
  streamToBuffer, 
  generateFileKey 
} from '../../src/aws/s3';

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

  // Note: Direct S3Client usage is now tested at the handler level
  // The s3-utils module now only contains utility functions
});