import * as dgram from 'dgram';
import * as os from 'os';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

interface LANDevice {
  id: string;
  displayId: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: number;
}

const DISCOVERY_PORT = 41234;
const BROADCAST_INTERVAL = 3000; // 3 seconds
const DEVICE_TIMEOUT = 10000; // 10 seconds

export class LANDiscoveryService extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private devices: Map<string, LANDevice> = new Map();
  private logger = new Logger('LANDiscovery');
  private deviceInfo: { id: string; displayId: string; name: string; port: number } | null = null;

  constructor() {
    super();
  }

  start(deviceInfo: { id: string; displayId: string; name: string; port: number }): void {
    this.deviceInfo = deviceInfo;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        this.logger.error('Socket error:', err);
        this.socket?.close();
      });

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });

      this.socket.on('listening', () => {
        const address = this.socket!.address();
        this.logger.info(`LAN Discovery listening on ${address.address}:${address.port}`);

        // Enable broadcast
        this.socket!.setBroadcast(true);

        // Start broadcasting our presence
        this.startBroadcasting();
      });

      this.socket.bind(DISCOVERY_PORT);

      // Cleanup stale devices
      this.cleanupInterval = setInterval(() => {
        this.cleanupStaleDevices();
      }, 5000);

    } catch (error) {
      this.logger.error('Failed to start LAN discovery:', error);
    }
  }

  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.devices.clear();
  }

  private startBroadcasting(): void {
    const broadcast = () => {
      if (!this.deviceInfo || !this.socket) return;

      const message = JSON.stringify({
        type: 'swiftconnect-announce',
        id: this.deviceInfo.id,
        displayId: this.deviceInfo.displayId,
        name: this.deviceInfo.name,
        port: this.deviceInfo.port,
        timestamp: Date.now(),
      });

      const broadcastAddresses = this.getBroadcastAddresses();

      for (const broadcastAddr of broadcastAddresses) {
        this.socket.send(message, DISCOVERY_PORT, broadcastAddr, (err) => {
          if (err) {
            this.logger.error(`Broadcast error to ${broadcastAddr}:`, err);
          }
        });
      }
    };

    // Broadcast immediately
    broadcast();

    // Then broadcast periodically
    this.broadcastInterval = setInterval(broadcast, BROADCAST_INTERVAL);
  }

  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type !== 'swiftconnect-announce') return;

      // Ignore our own broadcasts
      if (this.deviceInfo && data.id === this.deviceInfo.id) return;

      const device: LANDevice = {
        id: data.id,
        displayId: data.displayId,
        name: data.name,
        ip: rinfo.address,
        port: data.port,
        lastSeen: Date.now(),
      };

      const isNew = !this.devices.has(device.id);
      this.devices.set(device.id, device);

      if (isNew) {
        this.logger.info(`Discovered LAN device: ${device.name} at ${device.ip}:${device.port}`);
        this.emit('device-found', device);
      }

      this.emit('device-updated', device);

    } catch (error) {
      // Ignore invalid messages
    }
  }

  private cleanupStaleDevices(): void {
    const now = Date.now();

    for (const [id, device] of this.devices.entries()) {
      if (now - device.lastSeen > DEVICE_TIMEOUT) {
        this.devices.delete(id);
        this.logger.info(`LAN device lost: ${device.name}`);
        this.emit('device-lost', device);
      }
    }
  }

  private getBroadcastAddresses(): string[] {
    const addresses: string[] = [];
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name];
      if (!nets) continue;

      for (const net of nets) {
        // Skip internal and non-IPv4 addresses
        if (net.internal || net.family !== 'IPv4') continue;

        // Calculate broadcast address
        const ipParts = net.address.split('.').map(Number);
        const maskParts = net.netmask.split('.').map(Number);

        const broadcastParts = ipParts.map((ip, i) => {
          return (ip | (~maskParts[i] & 255));
        });

        addresses.push(broadcastParts.join('.'));
      }
    }

    // Also add the general broadcast address
    addresses.push('255.255.255.255');

    return [...new Set(addresses)];
  }

  getDevices(): LANDevice[] {
    return Array.from(this.devices.values());
  }

  getDeviceByDisplayId(displayId: string): LANDevice | undefined {
    const cleanId = displayId.replace(/\s/g, '');
    for (const device of this.devices.values()) {
      if (device.displayId === cleanId) {
        return device;
      }
    }
    return undefined;
  }

  getLocalIPs(): string[] {
    const ips: string[] = [];
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name];
      if (!nets) continue;

      for (const net of nets) {
        if (net.internal || net.family !== 'IPv4') continue;
        ips.push(net.address);
      }
    }

    return ips;
  }
}

export const lanDiscoveryService = new LANDiscoveryService();
