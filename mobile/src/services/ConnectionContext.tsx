import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface DeviceInfo {
  deviceId: string | null;
  displayId: string | null;
  sessionPassword: string | null;
}

interface ConnectionState {
  isConnected: boolean;
  isInSession: boolean;
  deviceInfo: DeviceInfo;
  connectedDeviceName: string | null;
  error: string | null;
}

interface ConnectionContextType extends ConnectionState {
  connect: () => Promise<void>;
  disconnect: () => void;
  requestConnection: (targetDisplayId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  acceptConnection: (sourceDeviceId: string) => void;
  rejectConnection: (sourceDeviceId: string) => void;
  endSession: () => void;
  sendInputEvent: (event: any) => void;
  socket: Socket | null;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

const SERVER_URL = 'http://localhost:3000'; // Change this to your server URL

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isInSession: false,
    deviceInfo: {
      deviceId: null,
      displayId: null,
      sessionPassword: null,
    },
    connectedDeviceName: null,
    error: null,
  });

  useEffect(() => {
    loadStoredDeviceId();
  }, []);

  const loadStoredDeviceId = async () => {
    try {
      const storedDeviceId = await AsyncStorage.getItem('deviceId');
      if (storedDeviceId) {
        connect(storedDeviceId);
      }
    } catch (error) {
      console.error('Failed to load stored device ID:', error);
    }
  };

  const connect = async (existingDeviceId?: string) => {
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      registerDevice(newSocket, existingDeviceId);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setState((prev) => ({ ...prev, error: 'Failed to connect to server' }));
    });

    newSocket.on('connection-accepted', (data) => {
      setState((prev) => ({
        ...prev,
        isInSession: true,
        connectedDeviceName: data.targetDeviceName,
      }));
    });

    newSocket.on('connection-rejected', (data) => {
      setState((prev) => ({
        ...prev,
        error: data.reason || 'Connection rejected',
      }));
    });

    newSocket.on('peer-disconnected', () => {
      setState((prev) => ({
        ...prev,
        isInSession: false,
        connectedDeviceName: null,
      }));
    });

    newSocket.on('session-ended', () => {
      setState((prev) => ({
        ...prev,
        isInSession: false,
        connectedDeviceName: null,
      }));
    });

    setSocket(newSocket);
  };

  const registerDevice = async (socket: Socket, existingDeviceId?: string) => {
    const deviceName = `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`;

    socket.emit(
      'register-device',
      {
        deviceName,
        deviceType: 'mobile',
        platform: Platform.OS,
        version: '1.0.0',
        existingDeviceId,
      },
      async (response: any) => {
        if (response.success) {
          const deviceInfo = {
            deviceId: response.deviceId,
            displayId: response.displayId,
            sessionPassword: response.sessionPassword,
          };
          setState((prev) => ({ ...prev, deviceInfo }));
          await AsyncStorage.setItem('deviceId', response.deviceId);
        }
      }
    );
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setState({
      isConnected: false,
      isInSession: false,
      deviceInfo: {
        deviceId: null,
        displayId: null,
        sessionPassword: null,
      },
      connectedDeviceName: null,
      error: null,
    });
  };

  const requestConnection = async (
    targetDisplayId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Not connected to server' });
        return;
      }

      socket.emit(
        'request-connection',
        { targetDisplayId, password },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        }
      );
    });
  };

  const acceptConnection = (sourceDeviceId: string) => {
    if (!socket) return;
    socket.emit('accept-connection', { sourceDeviceId });
  };

  const rejectConnection = (sourceDeviceId: string) => {
    if (!socket) return;
    socket.emit('reject-connection', { sourceDeviceId, reason: 'User declined' });
  };

  const endSession = () => {
    if (!socket) return;
    socket.emit('end-session');
    setState((prev) => ({
      ...prev,
      isInSession: false,
      connectedDeviceName: null,
    }));
  };

  const sendInputEvent = (event: any) => {
    if (!socket) return;
    socket.emit('input-event', event);
  };

  return (
    <ConnectionContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        requestConnection,
        acceptConnection,
        rejectConnection,
        endSession,
        sendInputEvent,
        socket,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
