import React, { useState, useCallback } from 'react';

interface Transfer {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  speed: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  direction: 'upload' | 'download';
}

interface FileTransferPanelProps {
  isInSession: boolean;
}

const FileTransferPanel: React.FC<FileTransferPanelProps> = ({ isInSession }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatSize(bytesPerSecond)}/s`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isInSession) {
      alert('Please connect to a device first');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      // In Electron, we'd get the file path and send it
      console.log('Would send file:', file.name);
    }
  }, [isInSession]);

  const getStatusColor = (status: Transfer['status']): string => {
    switch (status) {
      case 'in-progress': return 'text-indigo-400';
      case 'completed': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Transfer['status']) => {
    switch (status) {
      case 'in-progress':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="animate-fadeIn">
      <h1 className="text-2xl font-bold text-white mb-2">File Transfer</h1>
      <p className="text-gray-400 mb-8">Send and receive files securely with end-to-end encryption</p>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`card border-2 border-dashed transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : isInSession
            ? 'border-gray-600 hover:border-gray-500'
            : 'border-gray-700 opacity-50'
        }`}
      >
        <div className="py-12 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isDragging ? 'bg-indigo-500/20' : 'bg-gray-700'
          }`}>
            <svg className={`w-8 h-8 ${isDragging ? 'text-indigo-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-gray-400 text-sm mb-4">or</p>
          <button
            disabled={!isInSession}
            className="btn btn-primary disabled:opacity-50"
          >
            Browse Files
          </button>
          <p className="text-gray-500 text-xs mt-4">
            Maximum file size: 4GB • All files are encrypted
          </p>
        </div>
      </div>

      {!isInSession && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-amber-200 text-sm">
            Connect to a remote device to start transferring files
          </p>
        </div>
      )}

      {/* Transfers List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Transfers</h2>

        {transfers.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400">No file transfers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transfer.direction === 'upload' ? 'bg-indigo-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {transfer.direction === 'upload' ? (
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium truncate">{transfer.fileName}</p>
                      <span className={`text-sm ${getStatusColor(transfer.status)} flex items-center gap-1`}>
                        {getStatusIcon(transfer.status)}
                        {transfer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{formatSize(transfer.fileSize)}</span>
                      {transfer.status === 'in-progress' && (
                        <>
                          <span>•</span>
                          <span>{formatSpeed(transfer.speed)}</span>
                        </>
                      )}
                    </div>
                    {transfer.status === 'in-progress' && (
                      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${transfer.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTransferPanel;
