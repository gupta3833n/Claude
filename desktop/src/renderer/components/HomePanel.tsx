import React from 'react';

interface DeviceInfo {
  deviceId: string | null;
  displayId: string | null;
  sessionPassword: string | null;
}

interface HomePanelProps {
  deviceInfo: DeviceInfo;
  isConnected: boolean;
}

const HomePanel: React.FC<HomePanelProps> = ({ deviceInfo, isConnected }) => {
  const formatDisplayId = (id: string | null): string => {
    if (!id) return '--- --- ---';
    return id.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="animate-fadeIn">
      <h1 className="text-2xl font-bold text-white mb-6">Welcome to SwiftConnect</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your ID Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your ID</h2>
              <p className="text-sm text-gray-400">Share this with others to allow remote access</p>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 text-center mb-4">
            <div className="connection-id text-indigo-400 font-bold mb-2">
              {formatDisplayId(deviceInfo.displayId)}
            </div>
            <button
              onClick={() => deviceInfo.displayId && copyToClipboard(deviceInfo.displayId)}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy ID
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Session Password</p>
              <p className="font-mono text-lg font-bold text-white tracking-widest">
                {deviceInfo.sessionPassword || '------'}
              </p>
            </div>
            <button
              onClick={() => deviceInfo.sessionPassword && copyToClipboard(deviceInfo.sessionPassword)}
              className="btn btn-outline text-sm"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <svg className={`w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connection Status</h2>
              <p className="text-sm text-gray-400">Current server connection status</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
              <span className="text-gray-400">Server</span>
              <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
              <span className="text-gray-400">Ready for connections</span>
              <span className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
              <span className="text-gray-400">Encryption</span>
              <span className="badge badge-success">AES-256</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-gray-900/30 rounded-xl hover:bg-gray-700/50 transition-all group">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-300">Start Meeting</span>
            </button>

            <button className="p-4 bg-gray-900/30 rounded-xl hover:bg-gray-700/50 transition-all group">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-500/30 transition-colors">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-300">Send Files</span>
            </button>

            <button className="p-4 bg-gray-900/30 rounded-xl hover:bg-gray-700/50 transition-all group">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-500/30 transition-colors">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-300">Recent Sessions</span>
            </button>

            <button className="p-4 bg-gray-900/30 rounded-xl hover:bg-gray-700/50 transition-all group">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-300">Contacts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePanel;
