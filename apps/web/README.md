# FileFlow Web Frontend

A modern React application for testing the FileFlow serverless file processing platform.

## Features

- **File Upload**: Drag & drop or click to upload images (JPEG, PNG, WebP)
- **Progress Tracking**: Real-time upload progress visualization
- **Processing Status**: Visual indicators for file processing stages
- **Download Processed Files**: Access original, resized, and exposure-adjusted versions
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Automatic dark mode based on system preference
- **Error Handling**: Comprehensive error boundaries and user feedback

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zod** for runtime data validation
- **Lucide React** for icons
- **pnpm** for package management

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Backend API running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:5173
```

### Available Scripts

```bash
# Development
pnpm dev          # Start dev server with hot reload

# Building
pnpm build        # Build for production
pnpm preview      # Preview production build

# Code Quality
pnpm lint         # Run ESLint
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ErrorBoundary.tsx    # Error boundary component
│   ├── FileUpload.tsx       # Drag & drop upload component
│   ├── FileList.tsx         # File status display component
│   └── index.ts             # Barrel exports
├── hooks/               # Custom React hooks
│   └── useFileUpload.ts     # File upload state management
├── schemas/             # Zod schemas and types
│   └── index.ts             # API data validation schemas
├── services/            # External service integrations
│   └── api.ts               # Backend API client
├── utils/               # Utility functions
│   └── file.ts              # File handling utilities
├── App.tsx              # Root application component
├── main.tsx             # Application entry point
└── index.css            # Global styles with Tailwind
```

## API Integration

The frontend expects the backend API to provide:

### Upload Endpoint
```
POST /upload/presign
```

Request:
```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "fileSize": 1024000
}
```

Response:
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "key": "uploads/timestamp-uuid-filename.jpg",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

### File Processing

Files uploaded to S3 trigger automatic processing through Step Functions:
1. **Resize**: Creates resized version (1920x1080 max, maintaining aspect ratio)
2. **Exposure Adjustment**: Applies exposure correction
3. **Storage**: Processed files stored in S3 with metadata

## Configuration

### Environment Variables

Create `.env.local` to override defaults:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_BUCKET_NAME=your-bucket-name
```

### Tailwind Configuration

Dark mode is automatically enabled based on system preference:

```js
// tailwind.config.js
export default {
  darkMode: 'media', // Follows system dark mode
  // ...
}
```

## Development Guidelines

### Component Patterns

- **Function components only** (except error boundaries)
- **Named exports** from barrel exports
- **Zod schemas** for all API data validation
- **TypeScript inference** over explicit types
- **Tailwind classes** for all styling

### State Management

- **Local component state** with `useState`
- **Custom hooks** for reusable logic
- **No external state management** libraries

### Error Handling

- **Error boundaries** wrap main application sections
- **Try-catch blocks** for async operations
- **User-friendly error messages** with fallback UI

## Testing

The application includes:

- **File validation** for type and size limits
- **Upload progress tracking** with XMLHttpRequest
- **Error state handling** for network failures
- **Responsive design testing** across devices

## Performance

- **Code splitting** with React.lazy() for large components
- **Memoization** with useMemo/useCallback for expensive operations
- **Optimized images** and minimal bundle size
- **Fast refresh** in development with Vite + SWC

## Deployment

```bash
# Build for production
pnpm build

# Preview build locally
pnpm preview

# Deploy dist/ folder to your hosting service
```

## Browser Support

- Chrome/Edge 91+
- Firefox 90+
- Safari 15+

Modern browsers with ES2022 support required.