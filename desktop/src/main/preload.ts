import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Device
  registerDevice: (data: any) => ipcRenderer.invoke('device:register', data),
  getDeviceInfo: () => ipcRenderer.invoke('device:getInfo'),

  // Connection
  requestConnection: (data: { targetDisplayId: string; password: string }) =>
    ipcRenderer.invoke('connection:request', data),
  acceptConnection: (data: { sourceDeviceId: string }) =>
    ipcRenderer.send('connection:accept', data),
  rejectConnection: (data: { sourceDeviceId: string; reason?: string }) =>
    ipcRenderer.send('connection:reject', data),
  endConnection: () => ipcRenderer.send('connection:end'),

  // Screen
  getScreenSources: () => ipcRenderer.invoke('screen:getSources'),
  getDisplays: () => ipcRenderer.invoke('screen:getDisplays'),

  // File transfer
  sendFile: (data: { filePath: string }) => ipcRenderer.invoke('file:send', data),
  receiveFile: (data: any) => ipcRenderer.invoke('file:receive', data),

  // Clipboard
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (data: { text?: string }) => ipcRenderer.send('clipboard:write', data),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.send('settings:set', key, value),

  // Event listeners
  onIncomingConnection: (callback: (data: any) => void) => {
    ipcRenderer.on('connection:incoming', (_, data) => callback(data));
  },
  onConnectionEstablished: (callback: (data: any) => void) => {
    ipcRenderer.on('connection:established', (_, data) => callback(data));
  },
  onConnectionRejected: (callback: (data: any) => void) => {
    ipcRenderer.on('connection:rejected', (_, data) => callback(data));
  },
  onConnectionEnded: (callback: () => void) => {
    ipcRenderer.on('connection:ended', () => callback());
  },
  onSignal: (callback: (data: any) => void) => {
    ipcRenderer.on('signal', (_, data) => callback(data));
  },
  onChatMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('chat:message', (_, data) => callback(data));
  },
  onIncomingFile: (callback: (data: any) => void) => {
    ipcRenderer.on('file:incoming', (_, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      registerDevice: (data: any) => Promise<any>;
      getDeviceInfo: () => Promise<any>;
      requestConnection: (data: { targetDisplayId: string; password: string }) => Promise<any>;
      acceptConnection: (data: { sourceDeviceId: string }) => void;
      rejectConnection: (data: { sourceDeviceId: string; reason?: string }) => void;
      endConnection: () => void;
      getScreenSources: () => Promise<any[]>;
      getDisplays: () => Promise<any[]>;
      sendFile: (data: { filePath: string }) => Promise<any>;
      receiveFile: (data: any) => Promise<any>;
      readClipboard: () => Promise<{ text: string; html: string }>;
      writeClipboard: (data: { text?: string }) => void;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => void;
      onIncomingConnection: (callback: (data: any) => void) => void;
      onConnectionEstablished: (callback: (data: any) => void) => void;
      onConnectionRejected: (callback: (data: any) => void) => void;
      onConnectionEnded: (callback: () => void) => void;
      onSignal: (callback: (data: any) => void) => void;
      onChatMessage: (callback: (data: any) => void) => void;
      onIncomingFile: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
