import type React from 'react';
import { 
  File, 
  Download, 
  Trash2, 
  Clock, 
  Upload as UploadIcon, 
  Loader2, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import type { FileItem } from '@/schemas';
import { formatFileSize, getStatusColor } from '@/utils/file';
import { useApiService } from '@/context/ServiceContext';

interface FileListProps {
  files: FileItem[];
  onRemoveFile: (id: string) => void;
  onClearCompleted: () => void;
}

const StatusIcon: React.FC<{ status: FileItem['status'] }> = ({ status }) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (status) {
    case 'pending':
      return <Clock {...iconProps} />;
    case 'uploading':
      return <UploadIcon {...iconProps} />;
    case 'processing':
      return <Loader2 {...iconProps} className="w-4 h-4 animate-spin" />;
    case 'completed':
      return <CheckCircle {...iconProps} />;
    case 'failed':
      return <XCircle {...iconProps} />;
    default:
      return <Clock {...iconProps} />;
  }
};

const FileCard: React.FC<{ 
  file: FileItem; 
  onRemove: (id: string) => void; 
}> = ({ file, onRemove }) => {
  const apiService = useApiService();

  const handleDownload = async (key: string, filename: string) => {
    try {
      const url = await apiService.generateDownloadUrl(key);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <File className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.originalName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)} • {file.contentType}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(file.id)}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
          title="Remove file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        <StatusIcon status={file.status} />
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
          {file.status === 'uploading' && file.progress !== undefined ? (
            `Uploading ${file.progress}%`
          ) : (
            file.status.charAt(0).toUpperCase() + file.status.slice(1)
          )}
        </span>
      </div>

      {/* Progress bar for uploading */}
      {file.status === 'uploading' && file.progress !== undefined && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {file.status === 'failed' && file.error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          {file.error}
        </div>
      )}

      {/* Processed files */}
      {file.status === 'completed' && file.processedFiles && file.processedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Processed Files:
          </p>
          <div className="space-y-1">
            {file.processedFiles.map((processedFile, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                  {processedFile.type}
                </span>
                <button
                  onClick={() => handleDownload(processedFile.key, `${file.originalName}-${processedFile.type}`)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload time */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {new Date(file.uploadedAt).toLocaleString()}
      </p>
    </div>
  );
};

export const FileList: React.FC<FileListProps> = ({ files, onRemoveFile, onClearCompleted }) => {
  const completedCount = files.filter(f => f.status === 'completed' || f.status === 'failed').length;

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No files uploaded yet. Upload your first image above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Files ({files.length})
        </h2>
        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear completed ({completedCount})
          </button>
        )}
      </div>

      {/* File cards */}
      <div className="space-y-3">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onRemove={onRemoveFile}
          />
        ))}
      </div>
    </div>
  );
};