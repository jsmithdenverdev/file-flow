import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEnvironment } from '../index';

// Mock import.meta.env for testing
const mockEnv = vi.hoisted(() => ({
  VITE_API_BASE_URL: '',
  VITE_S3_BUCKET_NAME: '',
  VITE_AWS_REGION: '',
  VITE_NODE_ENV: '',
  VITE_ENABLE_DEBUG_LOGGING: '',
  MODE: 'development',
}));

vi.mock('import.meta', () => ({
  env: mockEnv,
}));

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset mock environment
    Object.keys(mockEnv).forEach(key => {
      mockEnv[key] = '';
    });
  });

  it('should parse valid environment configuration', () => {
    mockEnv.VITE_API_BASE_URL = 'https://api.example.com';
    mockEnv.VITE_S3_BUCKET_NAME = 'test-bucket';
    mockEnv.VITE_AWS_REGION = 'us-west-2';
    mockEnv.VITE_NODE_ENV = 'development';
    mockEnv.VITE_ENABLE_DEBUG_LOGGING = 'true';

    const config = parseEnvironment();

    expect(config).toEqual({
      API_BASE_URL: 'https://api.example.com',
      S3_BUCKET_NAME: 'test-bucket',
      AWS_REGION: 'us-west-2',
      NODE_ENV: 'development',
      ENABLE_DEBUG_LOGGING: true,
    });
  });

  it('should apply default values', () => {
    mockEnv.VITE_API_BASE_URL = 'https://api.example.com';
    mockEnv.VITE_S3_BUCKET_NAME = 'test-bucket';
    // Leave AWS_REGION, NODE_ENV, and ENABLE_DEBUG_LOGGING as empty to test defaults

    const config = parseEnvironment();

    expect(config.AWS_REGION).toBe('us-east-1');
    expect(config.NODE_ENV).toBe('development');
    expect(config.ENABLE_DEBUG_LOGGING).toBe(false);
  });

  it('should throw error for missing required variables', () => {
    mockEnv.VITE_API_BASE_URL = ''; // Missing required variable

    expect(() => parseEnvironment()).toThrow(/Environment validation failed/);
  });

  it('should throw error for invalid API_BASE_URL', () => {
    mockEnv.VITE_API_BASE_URL = 'not-a-valid-url';
    mockEnv.VITE_S3_BUCKET_NAME = 'test-bucket';

    expect(() => parseEnvironment()).toThrow(/API_BASE_URL must be a valid URL/);
  });
});