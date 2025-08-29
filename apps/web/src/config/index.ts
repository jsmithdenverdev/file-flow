import { z } from 'zod';

const EnvironmentSchema = z.object({
  API_BASE_URL: z.string().url('API_BASE_URL must be a valid URL'),
  S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required').default('us-east-1'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  ENABLE_DEBUG_LOGGING: z.string().transform(val => val === 'true').default('false'),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

const parseEnvironment = (): Environment => {
  const env = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    S3_BUCKET_NAME: import.meta.env.VITE_S3_BUCKET_NAME,
    AWS_REGION: import.meta.env.VITE_AWS_REGION,
    NODE_ENV: import.meta.env.VITE_NODE_ENV || import.meta.env.MODE,
    ENABLE_DEBUG_LOGGING: import.meta.env.VITE_ENABLE_DEBUG_LOGGING,
  };

  try {
    return EnvironmentSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
};

export interface AppConfig {
  api: {
    baseUrl: string;
  };
  aws: {
    bucketName: string;
    region: string;
  };
  app: {
    nodeEnv: Environment['NODE_ENV'];
    enableDebugLogging: boolean;
  };
}

const appConfig = (env: Environment): AppConfig => ({
  api: {
    baseUrl: env.API_BASE_URL,
  },
  aws: {
    bucketName: env.S3_BUCKET_NAME,
    region: env.AWS_REGION,
  },
  app: {
    nodeEnv: env.NODE_ENV,
    enableDebugLogging: env.ENABLE_DEBUG_LOGGING,
  },
});

// Parse and validate environment variables
const environment = parseEnvironment();

// Export the validated configuration
export const config = appConfig(environment);

// Export helper functions for conditional features
export const isDevelopment = () => config.app.nodeEnv === 'development';
export const isProduction = () => config.app.nodeEnv === 'production';
export const isDebugEnabled = () => config.app.enableDebugLogging;

// Export for testing purposes
export { parseEnvironment };