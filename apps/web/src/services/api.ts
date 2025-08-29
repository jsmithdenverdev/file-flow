import { z } from 'zod';
import { 
  UploadRequestSchema, 
  UploadResponseSchema, 
  ApiErrorSchema,
  type UploadRequest,
  type UploadResponse
} from '@/schemas';

const API_BASE_URL = 'http://localhost:3000';

class ApiService {
  private async fetchWithValidation<T>(
    url: string,
    options: RequestInit = {},
    responseSchema: z.ZodType<T>
  ): Promise<T> {
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
  }

  async getPresignedUrl(request: UploadRequest): Promise<UploadResponse> {
    // Validate request
    const validationResult = UploadRequestSchema.safeParse(request);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Invalid upload request: ${errors}`);
    }

    return this.fetchWithValidation<UploadResponse>(
      `${API_BASE_URL}/upload/presign`,
      {
        method: 'POST',
        body: JSON.stringify(validationResult.data),
      },
      UploadResponseSchema
    );
  }

  async uploadFile(
    file: File, 
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
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
  }

  async generateDownloadUrl(key: string): Promise<string> {
    // For this demo, we'll construct the S3 URL directly
    // In a real implementation, you might have an API endpoint for this
    const bucketName = 'your-bucket-name'; // This would come from config
    return `https://${bucketName}.s3.amazonaws.com/${encodeURIComponent(key)}`;
  }
}

export const apiService = new ApiService();