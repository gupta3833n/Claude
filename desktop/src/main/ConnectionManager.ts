import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import * as os from 'os';

interface DeviceRegistration {
  deviceName: string;
  existingDeviceId?: string;
}

interface ConnectionResult {
  success: boolean;
  deviceId?: string;
  displayId?: string;
  sessionPassword?: string;
  error?: string;
}

export class ConnectionManager extends EventEmitter {
  private socket: Socket | null = null;
  private serverUrl: string;
  private deviceId: string | null = null;
  private displayId: string | null = null;
  private sessionPassword: string | null = null;
  private connectedPeerId: string | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor(serverUrl: string) {
    super();
    this.serverUrl = serverUrl;
  }

  connect(existingDeviceId?: string): void {
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();

    if (existingDeviceId) {
      this.registerDevice({ deviceName: os.hostname(), existingDeviceId });
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.emit('disconnected');
    });

    this.socket.on('incoming-connection', (data) => {
      this.emit('incoming-connection', data);
    });

    this.socket.on('connection-accepted', (data) => {
      this.connectedPeerId = data.targetDeviceId;
      this.emit('connection-accepted', data);
      this.initiatePeerConnection(true);
    });

    this.socket.on('connection-rejected', (data) => {
      this.emit('connection-rejected', data);
    });

    this.socket.on('signal', async (data) => {
      await this.handleSignal(data);
    });

    this.socket.on('peer-disconnected', () => {
      this.cleanupPeerConnection();
      this.emit('peer-disconnected');
    });

    this.socket.on('session-ended', () => {
      this.cleanupPeerConnection();
      this.emit('session-ended');
    });

    this.socket.on('chat-message', (data) => {
      this.emit('chat-message', data);
    });

    this.socket.on('file-transfer-request', (data) => {
      this.emit('file-transfer-request', data);
    });

    this.socket.on('file-chunk', (data) => {
      this.emit('file-chunk', data);
    });

    this.socket.on('input-event', (data) => {
      this.emit('input-event', data);
    });

    this.socket.on('clipboard-sync', (data) => {
      this.emit('clipboard-sync', data);
    });
  }

  async registerDevice(data: DeviceRegistration): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('register-device', {
        deviceName: data.deviceName,
        deviceType: 'desktop',
        platform: this.getPlatform(),
        version: '1.0.0',
        existingDeviceId: data.existingDeviceId,
      }, (response: ConnectionResult) => {
        if (response.success) {
          this.deviceId = response.deviceId!;
          this.displayId = response.displayId!;
          this.sessionPassword = response.sessionPassword!;
        }
        resolve(response);
      });
    });
  }

  async requestConnection(targetDisplayId: string, password: string): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      this.socket.emit('request-connection', {
        targetDisplayId,
        password,
      }, (response: ConnectionResult) => {
        resolve(response);
      });
    });
  }

  acceptConnection(sourceDeviceId: string): void {
    if (!this.socket) return;
    this.connectedPeerId = sourceDeviceId;
    this.socket.emit('accept-connection', { sourceDeviceId });
    this.initiatePeerConnection(false);
  }

  rejectConnection(sourceDeviceId: string, reason?: string): void {
    if (!this.socket) return;
    this.socket.emit('reject-connection', { sourceDeviceId, reason });
  }

  endSession(): void {
    if (!this.socket) return;
    this.socket.emit('end-session');
    this.cleanupPeerConnection();
  }

  private async initiatePeerConnection(isInitiator: boolean): Promise<void> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          payload: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.emit('remote-stream', event.streams[0]);
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('data', {
        ordered: true,
      });
      this.setupDataChannel();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendSignal({
        type: 'offer',
        payload: offer,
      });
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel open');
      this.emit('data-channel-open');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.emit('data-channel-close');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('data-channel-message', data);
      } catch {
        // Binary data (file chunk)
        this.emit('file-chunk-direct', event.data);
      }
    };
  }

  private async handleSignal(data: any): Promise<void> {
    if (!this.peerConnection) {
      await this.initiatePeerConnection(false);
    }

    switch (data.type) {
      case 'offer':
        await this.peerConnection!.setRemoteDescription(data.payload);
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        this.sendSignal({
          type: 'answer',
          payload: answer,
        });
        break;

      case 'answer':
        await this.peerConnection!.setRemoteDescription(data.payload);
        break;

      case 'ice-candidate':
        await this.peerConnection!.addIceCandidate(data.payload);
        break;
    }
  }

  private sendSignal(data: any): void {
    if (!this.socket || !this.connectedPeerId) return;

    this.socket.emit('signal', {
      ...data,
      targetDeviceId: this.connectedPeerId,
      sourceDeviceId: this.deviceId,
    });
  }

  sendVideoFrame(frame: any): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'video-frame',
        data: frame,
      }));
    }
  }

  sendInputEvent(event: any): void {
    if (this.socket && this.connectedPeerId) {
      this.socket.emit('input-event', event);
    }
  }

  sendChatMessage(message: string): void {
    if (this.socket && this.connectedPeerId) {
      this.socket.emit('chat-message', { message });
    }
  }

  syncClipboard(content: string): void {
    if (this.socket && this.connectedPeerId) {
      this.socket.emit('clipboard-sync', { content, type: 'text' });
    }
  }

  private cleanupPeerConnection(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.connectedPeerId = null;
  }

  disconnect(): void {
    this.cleanupPeerConnection();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getDisplayId(): string | null {
    return this.displayId;
  }

  getSessionPassword(): string | null {
    return this.sessionPassword;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  private getPlatform(): string {
    switch (os.platform()) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      case 'linux': return 'linux';
      default: return 'unknown';
    }
  }
}
