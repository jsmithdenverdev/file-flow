# FileFlow - Serverless File Processing Platform

A serverless image processing platform built with AWS SAM, Lambda, and Step Functions. Upload images via presigned URLs and automatically process them through resize and exposure adjustment transformations.

## 🚀 Features

- **Presigned URL uploads** - Secure direct-to-S3 uploads
- **Automatic processing** - Event-driven image transformations
- **Step Functions orchestration** - Sequential processing pipeline
- **Image transformations**:
  - Resize with aspect ratio preservation
  - Exposure/brightness adjustment
- **Scalable architecture** - Serverless auto-scaling
- **Cost-effective** - Pay only for what you use

## 📁 Project Structure

```
file-flow/
├── packages/
│   └── backend/          # Serverless backend (AWS SAM)
│       ├── src/
│       │   ├── handlers/ # Lambda function handlers
│       │   ├── shared/   # Shared utilities
│       │   └── types/    # TypeScript type definitions
│       ├── template.yaml # SAM template (Infrastructure as Code)
│       └── samconfig.toml # SAM deployment configuration
├── apps/
│   └── web/             # Frontend application (future)
└── pnpm-workspace.yaml  # pnpm workspace configuration
```

## 🛠️ Prerequisites

- **Node.js 18+** - Required for Lambda runtime
- **pnpm 8+** - Package manager
- **AWS CLI** - Configured with credentials
- **AWS SAM CLI** - For deployment

```bash
# Install SAM CLI (macOS)
brew install aws-sam-cli

# Configure AWS credentials
aws configure
```

## 🚀 Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd file-flow
pnpm install
```

2. **Build the Sharp Lambda layer:**
```bash
cd packages/backend/layers/sharp
./build.sh
cd ../../../..
```

3. **Build the backend:**
```bash
pnpm -F @file-flow/backend build
```

4. **Deploy to AWS:**
```bash
cd packages/backend
pnpm deploy:dev
```

## 📝 API Endpoints

### Generate Presigned URL

```bash
POST /upload/presign

Request:
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1048576
}

Response:
{
  "uploadUrl": "https://...",
  "key": "uploads/...",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

## 🔄 Processing Pipeline

1. **Upload** - Client uploads image to S3 using presigned URL
2. **Trigger** - S3 event triggers orchestrator Lambda
3. **Orchestrate** - Step Functions workflow begins
4. **Validate** - File validation (type, size)
5. **Resize** - Image resizing with Sharp
6. **Adjust** - Exposure/brightness adjustment
7. **Complete** - Processed images saved to S3

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm -F @file-flow/backend test -- --coverage

# Run specific test file
pnpm -F @file-flow/backend test presigned-url.test.ts
```

## 🚢 Deployment

### Development
```bash
cd packages/backend
pnpm deploy:dev
```

### Staging
```bash
cd packages/backend
pnpm deploy:staging
```

### Production
```bash
cd packages/backend
pnpm deploy:prod
```

## 🔧 Configuration

Environment-specific configuration is managed through SAM parameters:

- `dev` - Development environment
- `staging` - Staging environment
- `prod` - Production environment

## 📊 Monitoring

- **CloudWatch Logs** - All Lambda function logs
- **X-Ray Tracing** - Distributed tracing enabled
- **Step Functions Console** - Visual workflow monitoring

## 🏗️ Architecture

- **AWS Lambda** - Serverless compute
- **Step Functions** - Workflow orchestration
- **S3** - File storage with lifecycle policies
- **API Gateway** - REST API with rate limiting
- **CloudWatch** - Logging and monitoring
- **X-Ray** - Distributed tracing

## 📄 License

MIT