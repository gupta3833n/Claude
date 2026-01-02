// Device Types
export interface Device {
  id: string;
  displayId: string;
  name: string;
  type: DeviceType;
  platform: Platform;
  version: string;
  status: DeviceStatus;
  lastSeen: number;
  createdAt: number;
  settings: DeviceSettings;
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'web';
export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';
export type DeviceStatus = 'online' | 'offline' | 'busy';

export interface DeviceSettings {
  allowUnattendedAccess: boolean;
  unattendedPassword?: string;
  whitelistedDevices: string[];
  blacklistedDevices: string[];
  autoAcceptConnections: boolean;
  quality: VideoQuality;
  enableClipboardSync: boolean;
  enableFileTransfer: boolean;
  enableRemoteInput: boolean;
}

export type VideoQuality = 'auto' | 'high' | 'medium' | 'low';

// Connection Types
export interface ConnectionRequest {
  targetDisplayId: string;
  password: string;
}

export interface ConnectionResponse {
  success: boolean;
  deviceId?: string;
  displayId?: string;
  sessionPassword?: string;
  error?: string;
}

export interface IncomingConnection {
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceType: DeviceType;
}

// Session Types
export interface Session {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  transferredBytes: number;
  status: SessionStatus;
}

export type SessionStatus = 'active' | 'completed' | 'terminated';

// Signaling Types
export interface SignalingMessage {
  type: SignalingType;
  payload: any;
  targetDeviceId: string;
  sourceDeviceId: string;
}

export type SignalingType = 'offer' | 'answer' | 'ice-candidate' | 'screen-config' | 'input-event' | 'clipboard' | 'chat';

// Input Types
export interface MouseEvent {
  type: 'mouse';
  action: MouseAction;
  x: number;
  y: number;
  scrollDelta?: number;
  button?: MouseButton;
}

export type MouseAction = 'move' | 'click' | 'doubleclick' | 'rightclick' | 'scroll';
export type MouseButton = 'left' | 'right' | 'middle';

export interface KeyboardEvent {
  type: 'keyboard';
  action: KeyboardAction;
  key: string;
  code: string;
  modifiers: KeyModifiers;
}

export type KeyboardAction = 'keydown' | 'keyup' | 'keypress';

export interface KeyModifiers {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export type InputEvent = MouseEvent | KeyboardEvent;

// File Transfer Types
export interface FileTransfer {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: TransferStatus;
  progress: number;
  transferredBytes: number;
  startTime: number;
  endTime?: number;
  speed?: number;
  error?: string;
}

export type TransferStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface FileChunk {
  transferId: string;
  chunkIndex: number;
  data: string; // Base64 encoded
  isLast: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'local' | 'remote';
  senderName: string;
  timestamp: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  lastLogin: number;
  twoFactorEnabled: boolean;
  devices: string[];
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
