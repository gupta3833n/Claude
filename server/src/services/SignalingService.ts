import { Server as SocketServer, Socket } from 'socket.io';
import { DeviceService, Device } from './DeviceService';
import { AuthService } from './AuthService';
import { FileTransferService } from './FileTransferService';
import { Logger } from '../utils/Logger';
import { generateSessionPassword, validateSessionPassword } from '../utils/crypto';

interface ConnectedClient {
  socket: Socket;
  deviceId: string;
  device: Device;
  sessionPassword: string;
  connectedTo: string | null;
  lastActivity: number;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'screen-config' | 'input-event' | 'clipboard' | 'chat';
  payload: any;
  targetDeviceId: string;
  sourceDeviceId: string;
}

export class SignalingService {
  private io: SocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private deviceService: DeviceService;
  private authService: AuthService;
  private fileTransferService: FileTransferService;
  private logger = new Logger('SignalingService');

  constructor(
    io: SocketServer,
    deviceService: DeviceService,
    authService: AuthService,
    fileTransferService: FileTransferService
  ) {
    this.io = io;
    this.deviceService = deviceService;
    this.authService = authService;
    this.fileTransferService = fileTransferService;
    this.setupSocketHandlers();
    this.startCleanupInterval();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info(`New connection: ${socket.id}`);

      socket.on('register-device', (data, callback) => this.handleRegisterDevice(socket, data, callback));
      socket.on('request-connection', (data, callback) => this.handleConnectionRequest(socket, data, callback));
      socket.on('accept-connection', (data) => this.handleAcceptConnection(socket, data));
      socket.on('reject-connection', (data) => this.handleRejectConnection(socket, data));
      socket.on('signal', (data) => this.handleSignal(socket, data));
      socket.on('file-transfer-request', (data, callback) => this.handleFileTransferRequest(socket, data, callback));
      socket.on('file-chunk', (data) => this.handleFileChunk(socket, data));
      socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
      socket.on('clipboard-sync', (data) => this.handleClipboardSync(socket, data));
      socket.on('input-event', (data) => this.handleInputEvent(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
      socket.on('end-session', () => this.handleEndSession(socket));
    });
  }

  private async handleRegisterDevice(socket: Socket, data: any, callback: Function): Promise<void> {
    try {
      const { deviceName, deviceType, platform, version } = data;

      // Generate or retrieve device ID
      let device = data.existingDeviceId
        ? await this.deviceService.getDevice(data.existingDeviceId)
        : null;

      if (!device) {
        device = await this.deviceService.registerDevice({
          name: deviceName,
          type: deviceType,
          platform,
          version,
        });
      }

      // Generate session password
      const sessionPassword = generateSessionPassword();

      // Store client
      this.clients.set(device.id, {
        socket,
        deviceId: device.id,
        device,
        sessionPassword,
        connectedTo: null,
        lastActivity: Date.now(),
      });

      // Update device status
      await this.deviceService.updateDeviceStatus(device.id, 'online');

      this.logger.info(`Device registered: ${device.id} (${deviceName})`);

      callback({
        success: true,
        deviceId: device.id,
        displayId: device.displayId,
        sessionPassword,
      });
    } catch (error) {
      this.logger.error('Error registering device:', error);
      callback({ success: false, error: 'Failed to register device' });
    }
  }

  private async handleConnectionRequest(socket: Socket, data: any, callback: Function): Promise<void> {
    try {
      const { targetDisplayId, password } = data;
      const sourceClient = this.getClientBySocket(socket);

      if (!sourceClient) {
        callback({ success: false, error: 'Not registered' });
        return;
      }

      // Find target device by display ID
      const targetDevice = await this.deviceService.getDeviceByDisplayId(targetDisplayId);
      if (!targetDevice) {
        callback({ success: false, error: 'Device not found' });
        return;
      }

      const targetClient = this.clients.get(targetDevice.id);
      if (!targetClient) {
        callback({ success: false, error: 'Device is offline' });
        return;
      }

      // Validate password
      if (!validateSessionPassword(password, targetClient.sessionPassword)) {
        callback({ success: false, error: 'Invalid password' });
        return;
      }

      // Send connection request to target
      targetClient.socket.emit('incoming-connection', {
        sourceDeviceId: sourceClient.deviceId,
        sourceDeviceName: sourceClient.device.name,
        sourceDeviceType: sourceClient.device.type,
      });

      callback({ success: true, message: 'Connection request sent' });
    } catch (error) {
      this.logger.error('Error handling connection request:', error);
      callback({ success: false, error: 'Failed to process connection request' });
    }
  }

  private handleAcceptConnection(socket: Socket, data: any): void {
    const { sourceDeviceId } = data;
    const targetClient = this.getClientBySocket(socket);
    const sourceClient = this.clients.get(sourceDeviceId);

    if (!targetClient || !sourceClient) {
      return;
    }

    // Mark both as connected
    targetClient.connectedTo = sourceDeviceId;
    sourceClient.connectedTo = targetClient.deviceId;

    // Notify source that connection is accepted
    sourceClient.socket.emit('connection-accepted', {
      targetDeviceId: targetClient.deviceId,
      targetDeviceName: targetClient.device.name,
    });

    this.logger.info(`Connection established: ${sourceDeviceId} <-> ${targetClient.deviceId}`);
  }

  private handleRejectConnection(socket: Socket, data: any): void {
    const { sourceDeviceId, reason } = data;
    const sourceClient = this.clients.get(sourceDeviceId);

    if (sourceClient) {
      sourceClient.socket.emit('connection-rejected', { reason });
    }
  }

  private handleSignal(socket: Socket, data: SignalingMessage): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const targetClient = this.clients.get(data.targetDeviceId);
    if (!targetClient) {
      return;
    }

    // Forward the signaling message
    targetClient.socket.emit('signal', {
      ...data,
      sourceDeviceId: client.deviceId,
    });

    client.lastActivity = Date.now();
  }

  private async handleFileTransferRequest(socket: Socket, data: any, callback: Function): Promise<void> {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      callback({ success: false, error: 'Not connected' });
      return;
    }

    const targetClient = this.clients.get(client.connectedTo);
    if (!targetClient) {
      callback({ success: false, error: 'Target not available' });
      return;
    }

    const transferId = await this.fileTransferService.initiateTransfer({
      sourceDeviceId: client.deviceId,
      targetDeviceId: client.connectedTo,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
    });

    targetClient.socket.emit('file-transfer-request', {
      transferId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      sourceDeviceName: client.device.name,
    });

    callback({ success: true, transferId });
  }

  private handleFileChunk(socket: Socket, data: any): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const targetClient = this.clients.get(client.connectedTo);
    if (!targetClient) {
      return;
    }

    // Forward file chunk to target
    targetClient.socket.emit('file-chunk', data);
  }

  private handleChatMessage(socket: Socket, data: any): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const targetClient = this.clients.get(client.connectedTo);
    if (!targetClient) {
      return;
    }

    targetClient.socket.emit('chat-message', {
      message: data.message,
      timestamp: Date.now(),
      senderName: client.device.name,
    });
  }

  private handleClipboardSync(socket: Socket, data: any): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const targetClient = this.clients.get(client.connectedTo);
    if (!targetClient) {
      return;
    }

    targetClient.socket.emit('clipboard-sync', {
      content: data.content,
      type: data.type,
    });
  }

  private handleInputEvent(socket: Socket, data: any): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const targetClient = this.clients.get(client.connectedTo);
    if (!targetClient) {
      return;
    }

    targetClient.socket.emit('input-event', data);
  }

  private handleDisconnect(socket: Socket): void {
    const client = this.getClientBySocket(socket);
    if (!client) {
      return;
    }

    // Notify connected peer
    if (client.connectedTo) {
      const peerClient = this.clients.get(client.connectedTo);
      if (peerClient) {
        peerClient.socket.emit('peer-disconnected');
        peerClient.connectedTo = null;
      }
    }

    // Update device status
    this.deviceService.updateDeviceStatus(client.deviceId, 'offline');

    // Remove client
    this.clients.delete(client.deviceId);

    this.logger.info(`Device disconnected: ${client.deviceId}`);
  }

  private handleEndSession(socket: Socket): void {
    const client = this.getClientBySocket(socket);
    if (!client || !client.connectedTo) {
      return;
    }

    const peerClient = this.clients.get(client.connectedTo);
    if (peerClient) {
      peerClient.socket.emit('session-ended');
      peerClient.connectedTo = null;
    }

    client.connectedTo = null;
    this.logger.info(`Session ended by ${client.deviceId}`);
  }

  private getClientBySocket(socket: Socket): ConnectedClient | undefined {
    for (const client of this.clients.values()) {
      if (client.socket.id === socket.id) {
        return client;
      }
    }
    return undefined;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [deviceId, client] of this.clients.entries()) {
        if (now - client.lastActivity > timeout && !client.connectedTo) {
          client.socket.disconnect(true);
          this.clients.delete(deviceId);
          this.deviceService.updateDeviceStatus(deviceId, 'offline');
        }
      }
    }, 60000); // Check every minute
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }
}
