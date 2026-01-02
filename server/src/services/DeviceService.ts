import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';

export interface Device {
  id: string;
  displayId: string; // 9-digit ID like TeamViewer
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';
  version: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen: number;
  createdAt: number;
  settings: DeviceSettings;
}

export interface DeviceSettings {
  allowUnattendedAccess: boolean;
  unattendedPassword?: string;
  whitelistedDevices: string[];
  blacklistedDevices: string[];
  autoAcceptConnections: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
  enableClipboardSync: boolean;
  enableFileTransfer: boolean;
  enableRemoteInput: boolean;
}

interface RegisterDeviceInput {
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';
  version: string;
}

export class DeviceService {
  private devices: Map<string, Device> = new Map();
  private displayIdToDeviceId: Map<string, string> = new Map();
  private logger = new Logger('DeviceService');

  private generateDisplayId(): string {
    // Generate a unique 9-digit ID (like TeamViewer)
    let displayId: string;
    do {
      displayId = Math.floor(100000000 + Math.random() * 900000000).toString();
    } while (this.displayIdToDeviceId.has(displayId));
    return displayId;
  }

  private formatDisplayId(displayId: string): string {
    // Format as XXX XXX XXX for display
    return displayId.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  async registerDevice(input: RegisterDeviceInput): Promise<Device> {
    const id = uuidv4();
    const displayId = this.generateDisplayId();

    const device: Device = {
      id,
      displayId,
      name: input.name,
      type: input.type,
      platform: input.platform,
      version: input.version,
      status: 'online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
      settings: {
        allowUnattendedAccess: false,
        whitelistedDevices: [],
        blacklistedDevices: [],
        autoAcceptConnections: false,
        quality: 'auto',
        enableClipboardSync: true,
        enableFileTransfer: true,
        enableRemoteInput: true,
      },
    };

    this.devices.set(id, device);
    this.displayIdToDeviceId.set(displayId, id);

    this.logger.info(`Device registered: ${id} with display ID: ${this.formatDisplayId(displayId)}`);
    return device;
  }

  async getDevice(id: string): Promise<Device | null> {
    return this.devices.get(id) || null;
  }

  async getDeviceByDisplayId(displayId: string): Promise<Device | null> {
    // Remove spaces if present
    const cleanDisplayId = displayId.replace(/\s/g, '');
    const deviceId = this.displayIdToDeviceId.get(cleanDisplayId);
    if (!deviceId) {
      return null;
    }
    return this.devices.get(deviceId) || null;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | null> {
    const device = this.devices.get(id);
    if (!device) {
      return null;
    }

    const updatedDevice = { ...device, ...updates };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async updateDeviceStatus(id: string, status: 'online' | 'offline' | 'busy'): Promise<void> {
    const device = this.devices.get(id);
    if (device) {
      device.status = status;
      device.lastSeen = Date.now();
      this.devices.set(id, device);
    }
  }

  async updateDeviceSettings(id: string, settings: Partial<DeviceSettings>): Promise<Device | null> {
    const device = this.devices.get(id);
    if (!device) {
      return null;
    }

    device.settings = { ...device.settings, ...settings };
    this.devices.set(id, device);
    return device;
  }

  async setUnattendedAccess(id: string, password: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    device.settings.allowUnattendedAccess = true;
    device.settings.unattendedPassword = password;
    this.devices.set(id, device);
    return true;
  }

  async disableUnattendedAccess(id: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    device.settings.allowUnattendedAccess = false;
    device.settings.unattendedPassword = undefined;
    this.devices.set(id, device);
    return true;
  }

  async addToWhitelist(id: string, targetDeviceId: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    if (!device.settings.whitelistedDevices.includes(targetDeviceId)) {
      device.settings.whitelistedDevices.push(targetDeviceId);
      this.devices.set(id, device);
    }
    return true;
  }

  async removeFromWhitelist(id: string, targetDeviceId: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    device.settings.whitelistedDevices = device.settings.whitelistedDevices.filter(
      (d) => d !== targetDeviceId
    );
    this.devices.set(id, device);
    return true;
  }

  async addToBlacklist(id: string, targetDeviceId: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    if (!device.settings.blacklistedDevices.includes(targetDeviceId)) {
      device.settings.blacklistedDevices.push(targetDeviceId);
      this.devices.set(id, device);
    }
    return true;
  }

  async getOnlineDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((d) => d.status === 'online');
  }

  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async deleteDevice(id: string): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }

    this.displayIdToDeviceId.delete(device.displayId);
    this.devices.delete(id);
    return true;
  }
}
