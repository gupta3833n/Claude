import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { EventEmitter } from 'events';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  path: string;
}

interface TransferProgress {
  transferId: string;
  fileName: string;
  totalBytes: number;
  transferredBytes: number;
  progress: number;
  speed: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
}

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export class FileTransferManager extends EventEmitter {
  private activeTransfers: Map<string, TransferProgress> = new Map();
  private downloadPath: string;

  constructor() {
    super();
    this.downloadPath = app.getPath('downloads');
  }

  setDownloadPath(path: string): void {
    this.downloadPath = path;
  }

  async sendFile(filePath: string, connectionManager: any): Promise<{ transferId: string; success: boolean; error?: string }> {
    try {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileSize = stats.size;
      const fileType = this.getFileType(fileName);

      // Request file transfer from server
      const response = await new Promise<any>((resolve) => {
        connectionManager.socket.emit('file-transfer-request', {
          fileName,
          fileSize,
          fileType,
        }, resolve);
      });

      if (!response.success) {
        return { transferId: '', success: false, error: response.error };
      }

      const transferId = response.transferId;

      // Initialize transfer progress
      const progress: TransferProgress = {
        transferId,
        fileName,
        totalBytes: fileSize,
        transferredBytes: 0,
        progress: 0,
        speed: 0,
        status: 'in-progress',
      };
      this.activeTransfers.set(transferId, progress);

      // Read and send file in chunks
      const startTime = Date.now();
      const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
      let chunkIndex = 0;

      for await (const chunk of fileStream) {
        if (progress.status === 'cancelled') {
          break;
        }

        connectionManager.socket.emit('file-chunk', {
          transferId,
          chunkIndex,
          data: (chunk as Buffer).toString('base64'),
          isLast: false,
        });

        progress.transferredBytes += chunk.length;
        progress.progress = Math.round((progress.transferredBytes / progress.totalBytes) * 100);

        const elapsed = (Date.now() - startTime) / 1000;
        progress.speed = elapsed > 0 ? progress.transferredBytes / elapsed : 0;

        this.emit('transfer-progress', progress);
        chunkIndex++;
      }

      if (progress.status !== 'cancelled') {
        // Send final chunk indicator
        connectionManager.socket.emit('file-chunk', {
          transferId,
          chunkIndex,
          data: '',
          isLast: true,
        });

        progress.status = 'completed';
        this.emit('transfer-complete', progress);
      }

      return { transferId, success: true };
    } catch (error: any) {
      return { transferId: '', success: false, error: error.message };
    }
  }

  async receiveFile(data: { transferId: string; fileName: string; fileSize: number }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    return new Promise((resolve) => {
      const { transferId, fileName, fileSize } = data;

      // Show save dialog
      dialog.showSaveDialog({
        defaultPath: path.join(this.downloadPath, fileName),
        title: 'Save File',
      }).then(result => {
        if (result.canceled || !result.filePath) {
          resolve({ success: false, error: 'Cancelled by user' });
          return;
        }

        const savePath = result.filePath;
        const writeStream = fs.createWriteStream(savePath);
        const chunks: Buffer[] = [];

        const progress: TransferProgress = {
          transferId,
          fileName,
          totalBytes: fileSize,
          transferredBytes: 0,
          progress: 0,
          speed: 0,
          status: 'in-progress',
        };
        this.activeTransfers.set(transferId, progress);

        const startTime = Date.now();

        // Handle incoming chunks
        const chunkHandler = (chunkData: { transferId: string; data: string; isLast: boolean }) => {
          if (chunkData.transferId !== transferId) return;

          if (chunkData.isLast) {
            // Write all chunks and close stream
            writeStream.end();
            progress.status = 'completed';
            this.emit('transfer-complete', progress);
            resolve({ success: true, filePath: savePath });
          } else {
            const chunk = Buffer.from(chunkData.data, 'base64');
            writeStream.write(chunk);

            progress.transferredBytes += chunk.length;
            progress.progress = Math.round((progress.transferredBytes / progress.totalBytes) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            progress.speed = elapsed > 0 ? progress.transferredBytes / elapsed : 0;

            this.emit('transfer-progress', progress);
          }
        };

        this.on('file-chunk', chunkHandler);
      }).catch(error => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  cancelTransfer(transferId: string): void {
    const progress = this.activeTransfers.get(transferId);
    if (progress) {
      progress.status = 'cancelled';
      this.emit('transfer-cancelled', progress);
    }
  }

  getActiveTransfers(): TransferProgress[] {
    return Array.from(this.activeTransfers.values());
  }

  getTransfer(transferId: string): TransferProgress | undefined {
    return this.activeTransfers.get(transferId);
  }

  private getFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    return types[ext] || 'application/octet-stream';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  formatSpeed(bytesPerSecond: number): string {
    return `${this.formatSize(bytesPerSecond)}/s`;
  }
}
