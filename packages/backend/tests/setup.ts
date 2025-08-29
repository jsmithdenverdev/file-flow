// Jest setup file
// Add any global test configuration here

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.ENVIRONMENT = 'test';
process.env.LOG_LEVEL = 'ERROR'; // Reduce noise during tests

// Add custom matchers if needed
expect.extend({
  // Custom matchers can be added here
});

// Global test utilities
global.console = {
  ...console,
  // Suppress console output during tests unless debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};