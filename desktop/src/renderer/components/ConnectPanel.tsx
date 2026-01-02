import React, { useState } from 'react';

interface ConnectPanelProps {
  onSessionStart: (deviceName: string) => void;
}

const ConnectPanel: React.FC<ConnectPanelProps> = ({ onSessionStart }) => {
  const [targetId, setTargetId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!targetId.trim() || !password.trim()) {
      setError('Please enter both ID and password');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const result = await window.electronAPI.requestConnection({
        targetDisplayId: targetId.replace(/\s/g, ''),
        password: password.toUpperCase(),
      });

      if (result.success) {
        // Connection request sent, waiting for acceptance
        // The actual session start will be triggered by the event listener
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const formatIdInput = (value: string) => {
    // Remove non-digits and format as XXX XXX XXX
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const parts = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join(' ');
  };

  return (
    <div className="animate-fadeIn max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Remote Control</h1>
      <p className="text-gray-400 mb-8">Connect to another computer using their ID and password</p>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connect to Partner</h2>
            <p className="text-sm text-gray-400">Enter the partner's SwiftConnect ID</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Partner ID</label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(formatIdInput(e.target.value))}
              placeholder="XXX XXX XXX"
              className="input text-center text-xl tracking-widest font-mono"
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
              className="input text-center text-xl tracking-widest font-mono uppercase"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting || !targetId.trim() || !password.trim()}
            className="w-full btn btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Connect
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Connections</h3>
          <div className="text-center text-gray-500 py-4">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No recent connections</p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-800/50 rounded-xl">
        <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to connect
        </h3>
        <ol className="text-sm text-gray-400 space-y-1 ml-6 list-decimal">
          <li>Ask your partner for their 9-digit SwiftConnect ID</li>
          <li>Enter the ID and the session password shown on their screen</li>
          <li>Click Connect and wait for them to accept</li>
        </ol>
      </div>
    </div>
  );
};

export default ConnectPanel;
