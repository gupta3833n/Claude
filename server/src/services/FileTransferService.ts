import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';

interface FileTransfer {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  transferredBytes: number;
  startTime: number;
  endTime?: number;
  speed?: number;
  error?: string;
}

interface InitiateTransferInput {
  sourceDeviceId: string;
  targetDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export class FileTransferService {
  private transfers: Map<string, FileTransfer> = new Map();
  private logger = new Logger('FileTransferService');
  private maxFileSize = 4 * 1024 * 1024 * 1024; // 4GB
  private chunkSize = 64 * 1024; // 64KB chunks

  async initiateTransfer(input: InitiateTransferInput): Promise<string> {
    if (input.fileSize > this.maxFileSize) {
      throw new Error('File size exceeds maximum allowed size (4GB)');
    }

    const transfer: FileTransfer = {
      id: uuidv4(),
      sourceDeviceId: input.sourceDeviceId,
      targetDeviceId: input.targetDeviceId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      fileType: input.fileType,
      status: 'pending',
      progress: 0,
      transferredBytes: 0,
      startTime: Date.now(),
    };

    this.transfers.set(transfer.id, transfer);
    this.logger.info(`File transfer initiated: ${transfer.id} - ${input.fileName}`);
    return transfer.id;
  }

  async startTransfer(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    transfer.status = 'in-progress';
    this.transfers.set(transferId, transfer);
  }

  async updateProgress(transferId: string, bytesTransferred: number): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return;
    }

    transfer.transferredBytes = bytesTransferred;
    transfer.progress = Math.round((bytesTransferred / transfer.fileSize) * 100);

    const elapsed = Date.now() - transfer.startTime;
    if (elapsed > 0) {
      transfer.speed = bytesTransferred / (elapsed / 1000); // bytes per second
    }

    this.transfers.set(transferId, transfer);
  }

  async completeTransfer(transferId: string): Promise<FileTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return null;
    }

    transfer.status = 'completed';
    transfer.progress = 100;
    transfer.endTime = Date.now();

    this.transfers.set(transferId, transfer);
    this.logger.info(`File transfer completed: ${transferId}`);
    return transfer;
  }

  async failTransfer(transferId: string, error: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return;
    }

    transfer.status = 'failed';
    transfer.error = error;
    transfer.endTime = Date.now();

    this.transfers.set(transferId, transfer);
    this.logger.error(`File transfer failed: ${transferId} - ${error}`);
  }

  async cancelTransfer(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return;
    }

    transfer.status = 'cancelled';
    transfer.endTime = Date.now();

    this.transfers.set(transferId, transfer);
    this.logger.info(`File transfer cancelled: ${transferId}`);
  }

  async getTransfer(transferId: string): Promise<FileTransfer | null> {
    return this.transfers.get(transferId) || null;
  }

  async getTransfersForDevice(deviceId: string): Promise<FileTransfer[]> {
    return Array.from(this.transfers.values()).filter(
      (t) => t.sourceDeviceId === deviceId || t.targetDeviceId === deviceId
    );
  }

  async getActiveTransfers(): Promise<FileTransfer[]> {
    return Array.from(this.transfers.values()).filter(
      (t) => t.status === 'in-progress' || t.status === 'pending'
    );
  }

  getChunkSize(): number {
    return this.chunkSize;
  }

  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(2)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
    } else if (bytesPerSecond < 1024 * 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
}
