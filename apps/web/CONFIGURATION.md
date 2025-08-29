# Configuration Guide

This document explains how to configure the FileFlow web application using environment variables and dependency injection.

## Environment Variables

The application uses Vite's environment variable system. All environment variables must be prefixed with `VITE_` to be accessible in the browser.

### Required Variables

- `VITE_API_BASE_URL`: The base URL of the backend API (e.g., `http://localhost:3000`)
- `VITE_S3_BUCKET_NAME`: The name of the S3 bucket where files are stored

### Optional Variables

- `VITE_AWS_REGION`: AWS region (defaults to `us-east-1`)
- `VITE_NODE_ENV`: Environment mode (defaults to `development`)
- `VITE_ENABLE_DEBUG_LOGGING`: Enable debug logging (defaults to `false`)

### Setting Up Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_S3_BUCKET_NAME=your-actual-bucket-name
   VITE_AWS_REGION=us-west-2
   VITE_NODE_ENV=development
   VITE_ENABLE_DEBUG_LOGGING=true
   ```

3. The application will validate these variables on startup and throw descriptive errors if any are invalid.

## Dependency Injection Architecture

The application uses a composition root pattern for dependency injection:

### Key Components

1. **Configuration** (`src/config/index.ts`)
   - Validates and exports typed environment variables
   - Provides helper functions for environment detection

2. **Composition Root** (`src/composition-root.ts`)
   - Single place where all dependencies are wired together
   - Creates and configures all services
   - Exports singleton instances

3. **Service Context** (`src/context/ServiceContext.tsx`)
   - React context for providing services to components
   - Ensures services are available throughout the component tree
   - Provides typed hooks for accessing services

4. **Services** (`src/services/`)
   - Stateless services that receive dependencies as constructor parameters
   - Follow closure pattern: `serviceName(dependencies): ServiceInterface`
   - No service creates its own dependencies

### Usage Examples

#### Accessing Services in Components

```tsx
import { useApiService } from '@/context/ServiceContext';

const MyComponent = () => {
  const apiService = useApiService();
  
  // Use the service...
  const handleUpload = async () => {
    const result = await apiService.getPresignedUrl(request);
    // ...
  };
};
```

#### Creating New Services

```tsx
// Define interface
interface MyService {
  doSomething(): Promise<void>;
}

// Define dependencies
interface MyServiceDependencies {
  config: AppConfig;
  logger: Logger;
}

// Create service factory
export const myService = (deps: MyServiceDependencies): MyService => ({
  async doSomething() {
    deps.logger.info('Doing something...');
    // Implementation using deps.config
  },
});

// Add to composition root
const services = {
  // existing services...
  myService: myService({ config, logger }),
};
```

## Testing

The configuration system includes comprehensive tests:

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Validation

The application uses Zod for runtime validation of environment variables. If validation fails, you'll see clear error messages indicating what's wrong:

```
Environment validation failed:
API_BASE_URL: API_BASE_URL must be a valid URL
S3_BUCKET_NAME: S3_BUCKET_NAME is required
```

This ensures configuration errors are caught early and provides clear debugging information.