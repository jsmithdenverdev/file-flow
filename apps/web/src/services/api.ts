import { z } from 'zod';
import { 
  UploadRequestSchema, 
  UploadResponseSchema, 
  ApiErrorSchema,
  type UploadRequest,
  type UploadResponse
} from '@/schemas';
import type { AppConfig } from '@/config';

interface ApiServiceDependencies {
  config: AppConfig;
}

export interface ApiService {
  getPresignedUrl(request: UploadRequest): Promise<UploadResponse>;
  uploadFile(
    file: File, 
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void>;
  generateDownloadUrl(key: string): Promise<string>;
}

const fetchWithValidation = async <T>(
  url: string,
  options: RequestInit = {},
  responseSchema: z.ZodType<T>
): Promise<T> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // Try to parse as error response
      const errorResult = ApiErrorSchema.safeParse(data);
      const errorMessage = errorResult.success 
        ? errorResult.data.error 
        : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Validate successful response
    const result = responseSchema.safeParse(data);
    if (!result.success) {
      console.error('Invalid API response:', result.error.issues);
      throw new Error('Invalid response format from server');
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
};

const uploadFileWithProgress = (
  file: File, 
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
};

export const apiService = (dependencies: ApiServiceDependencies): ApiService => {
  const { config } = dependencies;

  return {
    async getPresignedUrl(request: UploadRequest): Promise<UploadResponse> {
      // Validate request
      const validationResult = UploadRequestSchema.safeParse(request);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(
          issue => `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new Error(`Invalid upload request: ${errors}`);
      }

      return fetchWithValidation<UploadResponse>(
        `${config.api.baseUrl}/upload/presign`,
        {
          method: 'POST',
          body: JSON.stringify(validationResult.data),
        },
        UploadResponseSchema
      );
    },

    async uploadFile(
      file: File, 
      uploadUrl: string,
      onProgress?: (progress: number) => void
    ): Promise<void> {
      return uploadFileWithProgress(file, uploadUrl, onProgress);
    },

    async generateDownloadUrl(key: string): Promise<string> {
      // Construct S3 URL using configuration
      return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${encodeURIComponent(key)}`;
    },
  };
};