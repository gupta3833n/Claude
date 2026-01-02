import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

interface ConnectionState {
  isConnected: boolean;
  isInSession: boolean;
  targetDeviceName: string | null;
}

const App: React.FC = () => {
  const [targetId, setTargetId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isInSession: false,
    targetDeviceName: null,
  });
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      // Register as web viewer
      socket.emit('register-device', {
        deviceName: 'Web Viewer',
        deviceType: 'web',
        platform: 'web',
        version: '1.0.0',
      }, () => {});
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false, isInSession: false }));
    });

    socket.on('connection-accepted', (data) => {
      setState((prev) => ({
        ...prev,
        isInSession: true,
        targetDeviceName: data.targetDeviceName,
      }));
    });

    socket.on('connection-rejected', (data) => {
      setError(data.reason || 'Connection rejected');
      setIsConnecting(false);
    });

    socket.on('signal', (data) => {
      if (data.type === 'video-frame') {
        setCurrentFrame(data.payload.data);
      }
    });

    socket.on('session-ended', () => {
      setState((prev) => ({ ...prev, isInSession: false, targetDeviceName: null }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const formatIdInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join(' ');
  };

  const handleConnect = () => {
    if (!targetId.trim() || !password.trim()) {
      setError('Please enter both ID and password');
      return;
    }

    setIsConnecting(true);
    setError('');

    socketRef.current?.emit('request-connection', {
      targetDisplayId: targetId.replace(/\s/g, ''),
      password: password.toUpperCase(),
    }, (response: any) => {
      if (!response.success) {
        setError(response.error || 'Connection failed');
        setIsConnecting(false);
      }
    });
  };

  const handleEndSession = () => {
    socketRef.current?.emit('end-session');
    setState((prev) => ({ ...prev, isInSession: false, targetDeviceName: null }));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.isInSession) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    socketRef.current?.emit('input-event', {
      type: 'mouse',
      action: 'move',
      x,
      y,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.isInSession) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    socketRef.current?.emit('input-event', {
      type: 'mouse',
      action: 'click',
      x,
      y,
    });
  };

  if (state.isInSession) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-medium">{state.targetDeviceName}</span>
            <span className="text-gray-400 text-sm">• Connected</span>
          </div>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            End Session
          </button>
        </div>

        {/* Remote View */}
        <div
          className="flex-1 flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {currentFrame ? (
            <img
              src={`data:image/jpeg;base64,${currentFrame}`}
              alt="Remote Screen"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-50">🖥️</div>
              <p className="text-gray-400">Waiting for screen...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SwiftConnect</h1>
          <p className="text-gray-400">Fast & Secure Remote Desktop</p>
        </div>

        {/* Connection Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-400">
              {state.isConnected ? 'Connected to server' : 'Connecting...'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Partner ID</label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(formatIdInput(e.target.value))}
                placeholder="XXX XXX XXX"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white text-center text-xl tracking-widest font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white text-center text-xl tracking-widest font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isConnecting || !targetId.trim() || !password.trim() || !state.isConnected}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-800/30 rounded-xl">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-xs text-gray-400">End-to-End Encrypted</p>
          </div>
          <div className="p-4 bg-gray-800/30 rounded-xl">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-xs text-gray-400">Low Latency</p>
          </div>
          <div className="p-4 bg-gray-800/30 rounded-xl">
            <div className="text-2xl mb-2">📁</div>
            <p className="text-xs text-gray-400">File Transfer</p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Download the desktop app for full remote control
        </p>
      </div>
    </div>
  );
};

export default App;
