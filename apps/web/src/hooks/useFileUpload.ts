import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';
import { validateFile, generateFileId } from '@/utils/file';
import type { FileItem, FileStatus } from '@/schemas';

interface UseFileUploadReturn {
  files: FileItem[];
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateFileStatus = useCallback((id: string, status: FileStatus, error?: string) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, status, error } : file
    ));
  }, []);

  const updateFileProgress = useCallback((id: string, progress: number) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, progress } : file
    ));
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const fileId = generateFileId();
    const fileItem: FileItem = {
      id: fileId,
      originalName: file.name,
      key: '', // Will be set after getting presigned URL
      contentType: file.type,
      size: file.size,
      status: 'pending',
      uploadedAt: new Date().toISOString(),
    };

    // Add file to list
    setFiles(prev => [...prev, fileItem]);
    setIsUploading(true);

    try {
      // Get presigned URL
      const uploadResponse = await apiService.getPresignedUrl({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      // Update file with key
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, key: uploadResponse.key } : f
      ));

      // Start upload
      updateFileStatus(fileId, 'uploading');
      
      await apiService.uploadFile(
        file, 
        uploadResponse.uploadUrl,
        (progress) => updateFileProgress(fileId, progress)
      );

      // Upload completed, now processing will start automatically via S3 trigger
      updateFileStatus(fileId, 'processing');

      // In a real implementation, you'd poll for status or use WebSockets
      // For now, we'll simulate processing completion after a delay
      setTimeout(() => {
        updateFileStatus(fileId, 'completed');
        setFiles(prev => prev.map(f => 
          f.id === fileId ? {
            ...f,
            processedFiles: [
              { key: uploadResponse.key, type: 'original' },
              { key: uploadResponse.key.replace('uploads/', 'processed/').replace(/\.[^.]+$/, '-resized.jpg'), type: 'resized' },
              { key: uploadResponse.key.replace('uploads/', 'processed/').replace(/\.[^.]+$/, '-exposure-adjusted.jpg'), type: 'adjusted' },
            ]
          } : f
        ));
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateFileStatus(fileId, 'failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [updateFileStatus, updateFileProgress]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(file => file.status !== 'completed' && file.status !== 'failed'));
  }, []);

  return {
    files,
    isUploading,
    uploadFile,
    removeFile,
    clearCompleted,
  };
}