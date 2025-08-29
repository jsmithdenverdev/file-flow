import type React from 'react';
import { FileUpload, FileList, ErrorBoundary } from '@/components';
import { useFileUpload } from '@/hooks/useFileUpload';

const App: React.FC = () => {
  const { files, isUploading, uploadFile, removeFile, clearCompleted } = useFileUpload();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              FileFlow
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Upload images to test the serverless file processing platform. 
              Files are processed through resize and exposure adjustment pipelines.
            </p>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upload Image
            </h2>
            <FileUpload 
              onFileSelect={uploadFile}
              isUploading={isUploading}
            />
          </div>

          {/* Files Section */}
          <div>
            <FileList 
              files={files}
              onRemoveFile={removeFile}
              onClearCompleted={clearCompleted}
            />
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Built with React, TypeScript, Tailwind CSS, and Vite
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;