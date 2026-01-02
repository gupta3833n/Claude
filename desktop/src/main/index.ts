import { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, nativeImage, clipboard, globalShortcut } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { ConnectionManager } from './ConnectionManager';
import { ScreenCapture } from './ScreenCapture';
import { InputHandler } from './InputHandler';
import { FileTransferManager } from './FileTransferManager';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let connectionManager: ConnectionManager;
let screenCapture: ScreenCapture;
let inputHandler: InputHandler;
let fileTransferManager: FileTransferManager;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open SwiftConnect', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Start on Login', type: 'checkbox', checked: store.get('startOnLogin', false) as boolean, click: (item) => {
      store.set('startOnLogin', item.checked);
      app.setLoginItemSettings({ openAtLogin: item.checked });
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.quit();
    }},
  ]);

  tray.setToolTip('SwiftConnect');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

function initializeServices(): void {
  const serverUrl = store.get('serverUrl', 'http://localhost:3000') as string;

  connectionManager = new ConnectionManager(serverUrl);
  screenCapture = new ScreenCapture();
  inputHandler = new InputHandler();
  fileTransferManager = new FileTransferManager();

  // Set up IPC handlers
  setupIpcHandlers();

  // Auto-connect if device ID exists
  const existingDeviceId = store.get('deviceId') as string | undefined;
  if (existingDeviceId) {
    connectionManager.connect(existingDeviceId);
  }
}

function setupIpcHandlers(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.hide());

  // Device registration
  ipcMain.handle('device:register', async (_, data) => {
    const result = await connectionManager.registerDevice(data);
    if (result.success) {
      store.set('deviceId', result.deviceId);
    }
    return result;
  });

  ipcMain.handle('device:getInfo', () => {
    return {
      deviceId: store.get('deviceId'),
      displayId: connectionManager.getDisplayId(),
      sessionPassword: connectionManager.getSessionPassword(),
    };
  });

  // Connection
  ipcMain.handle('connection:request', async (_, data) => {
    return connectionManager.requestConnection(data.targetDisplayId, data.password);
  });

  ipcMain.on('connection:accept', (_, data) => {
    connectionManager.acceptConnection(data.sourceDeviceId);
    startScreenSharing();
  });

  ipcMain.on('connection:reject', (_, data) => {
    connectionManager.rejectConnection(data.sourceDeviceId, data.reason);
  });

  ipcMain.on('connection:end', () => {
    stopScreenSharing();
    connectionManager.endSession();
  });

  // Screen capture
  ipcMain.handle('screen:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  });

  ipcMain.handle('screen:getDisplays', () => {
    return screen.getAllDisplays().map((display, index) => ({
      id: display.id,
      index,
      bounds: display.bounds,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    }));
  });

  // File transfer
  ipcMain.handle('file:send', async (_, data) => {
    return fileTransferManager.sendFile(data.filePath, connectionManager);
  });

  ipcMain.handle('file:receive', async (_, data) => {
    return fileTransferManager.receiveFile(data);
  });

  // Clipboard
  ipcMain.handle('clipboard:read', () => {
    return {
      text: clipboard.readText(),
      html: clipboard.readHTML(),
    };
  });

  ipcMain.on('clipboard:write', (_, data) => {
    if (data.text) {
      clipboard.writeText(data.text);
    }
  });

  // Settings
  ipcMain.handle('settings:get', (_, key) => {
    return store.get(key);
  });

  ipcMain.on('settings:set', (_, key, value) => {
    store.set(key, value);
  });

  // Connection manager events
  connectionManager.on('incoming-connection', (data) => {
    mainWindow?.webContents.send('connection:incoming', data);
    mainWindow?.show();
  });

  connectionManager.on('connection-accepted', (data) => {
    mainWindow?.webContents.send('connection:established', data);
  });

  connectionManager.on('connection-rejected', (data) => {
    mainWindow?.webContents.send('connection:rejected', data);
  });

  connectionManager.on('peer-disconnected', () => {
    stopScreenSharing();
    mainWindow?.webContents.send('connection:ended');
  });

  connectionManager.on('session-ended', () => {
    stopScreenSharing();
    mainWindow?.webContents.send('connection:ended');
  });

  connectionManager.on('signal', (data) => {
    mainWindow?.webContents.send('signal', data);
  });

  connectionManager.on('chat-message', (data) => {
    mainWindow?.webContents.send('chat:message', data);
  });

  connectionManager.on('file-transfer-request', (data) => {
    mainWindow?.webContents.send('file:incoming', data);
  });

  connectionManager.on('input-event', (data) => {
    inputHandler.handleInput(data);
  });

  connectionManager.on('clipboard-sync', (data) => {
    if (data.text) {
      clipboard.writeText(data.text);
    }
  });
}

function startScreenSharing(): void {
  screenCapture.start((frame) => {
    connectionManager.sendVideoFrame(frame);
  });
}

function stopScreenSharing(): void {
  screenCapture.stop();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  initializeServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});

app.on('before-quit', () => {
  connectionManager?.disconnect();
  globalShortcut.unregisterAll();
});
