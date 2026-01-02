import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import HomePanel from './components/HomePanel';
import ConnectPanel from './components/ConnectPanel';
import FileTransferPanel from './components/FileTransferPanel';
import SettingsPanel from './components/SettingsPanel';
import RemoteSession from './components/RemoteSession';
import IncomingConnectionModal from './components/IncomingConnectionModal';
import ChatPanel from './components/ChatPanel';

type Panel = 'home' | 'connect' | 'files' | 'settings';

interface DeviceInfo {
  deviceId: string | null;
  displayId: string | null;
  sessionPassword: string | null;
}

interface IncomingConnection {
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceType: string;
}

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<Panel>('home');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceId: null,
    displayId: null,
    sessionPassword: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isInSession, setIsInSession] = useState(false);
  const [incomingConnection, setIncomingConnection] = useState<IncomingConnection | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    initializeDevice();
    setupEventListeners();

    return () => {
      // Cleanup listeners
      window.electronAPI.removeAllListeners('connection:incoming');
      window.electronAPI.removeAllListeners('connection:established');
      window.electronAPI.removeAllListeners('connection:rejected');
      window.electronAPI.removeAllListeners('connection:ended');
    };
  }, []);

  const initializeDevice = async () => {
    try {
      // Check if device is already registered
      const info = await window.electronAPI.getDeviceInfo();
      if (info.deviceId) {
        setDeviceInfo(info);
        setIsConnected(true);
      } else {
        // Register new device
        const hostname = await window.electronAPI.getSetting('deviceName') || 'My Computer';
        const result = await window.electronAPI.registerDevice({ deviceName: hostname });
        if (result.success) {
          setDeviceInfo({
            deviceId: result.deviceId,
            displayId: result.displayId,
            sessionPassword: result.sessionPassword,
          });
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Failed to initialize device:', error);
    }
  };

  const setupEventListeners = () => {
    window.electronAPI.onIncomingConnection((data: IncomingConnection) => {
      setIncomingConnection(data);
    });

    window.electronAPI.onConnectionEstablished((data) => {
      setConnectedDeviceName(data.targetDeviceName);
      setIsInSession(true);
      setIncomingConnection(null);
    });

    window.electronAPI.onConnectionRejected((data) => {
      alert(`Connection rejected: ${data.reason || 'No reason provided'}`);
    });

    window.electronAPI.onConnectionEnded(() => {
      setIsInSession(false);
      setConnectedDeviceName('');
    });
  };

  const handleAcceptConnection = () => {
    if (incomingConnection) {
      window.electronAPI.acceptConnection({ sourceDeviceId: incomingConnection.sourceDeviceId });
      setConnectedDeviceName(incomingConnection.sourceDeviceName);
      setIsInSession(true);
    }
    setIncomingConnection(null);
  };

  const handleRejectConnection = () => {
    if (incomingConnection) {
      window.electronAPI.rejectConnection({
        sourceDeviceId: incomingConnection.sourceDeviceId,
        reason: 'User declined the connection'
      });
    }
    setIncomingConnection(null);
  };

  const handleEndSession = () => {
    window.electronAPI.endConnection();
    setIsInSession(false);
    setConnectedDeviceName('');
    setShowChat(false);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'home':
        return <HomePanel deviceInfo={deviceInfo} isConnected={isConnected} />;
      case 'connect':
        return <ConnectPanel onSessionStart={(name) => { setConnectedDeviceName(name); setIsInSession(true); }} />;
      case 'files':
        return <FileTransferPanel isInSession={isInSession} />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <HomePanel deviceInfo={deviceInfo} isConnected={isConnected} />;
    }
  };

  if (isInSession) {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <TitleBar />
        <div className="flex-1 flex">
          <RemoteSession
            deviceName={connectedDeviceName}
            onEndSession={handleEndSession}
            onToggleChat={() => setShowChat(!showChat)}
          />
          {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
        <main className="flex-1 overflow-auto p-6">
          {renderPanel()}
        </main>
      </div>

      {incomingConnection && (
        <IncomingConnectionModal
          connection={incomingConnection}
          onAccept={handleAcceptConnection}
          onReject={handleRejectConnection}
        />
      )}
    </div>
  );
};

export default App;
