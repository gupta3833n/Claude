import React, { useState, useEffect } from 'react';

interface Settings {
  deviceName: string;
  startOnLogin: boolean;
  minimizeToTray: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
  enableClipboardSync: boolean;
  enableFileTransfer: boolean;
  allowUnattendedAccess: boolean;
  unattendedPassword: string;
  serverUrl: string;
}

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    deviceName: 'My Computer',
    startOnLogin: false,
    minimizeToTray: true,
    quality: 'auto',
    enableClipboardSync: true,
    enableFileTransfer: true,
    allowUnattendedAccess: false,
    unattendedPassword: '',
    serverUrl: 'http://localhost:3000',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const keys = Object.keys(settings) as (keyof Settings)[];
    const loadedSettings: Partial<Settings> = {};

    for (const key of keys) {
      const value = await window.electronAPI.getSetting(key);
      if (value !== undefined) {
        loadedSettings[key] = value;
      }
    }

    setSettings((prev) => ({ ...prev, ...loadedSettings }));
  };

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    window.electronAPI.setSetting(key, value);
    showSavedIndicator();
  };

  const showSavedIndicator = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fadeIn max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure SwiftConnect to your preferences</p>
        </div>
        {saved && (
          <span className="flex items-center gap-2 text-emerald-400 text-sm animate-fadeIn">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Device Name</label>
              <input
                type="text"
                value={settings.deviceName}
                onChange={(e) => handleChange('deviceName', e.target.value)}
                className="input"
                placeholder="My Computer"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Start on login</p>
                <p className="text-sm text-gray-400">Launch SwiftConnect when you start your computer</p>
              </div>
              <button
                onClick={() => handleChange('startOnLogin', !settings.startOnLogin)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.startOnLogin ? 'bg-indigo-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.startOnLogin ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Minimize to tray</p>
                <p className="text-sm text-gray-400">Keep running in the background when closed</p>
              </div>
              <button
                onClick={() => handleChange('minimizeToTray', !settings.minimizeToTray)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.minimizeToTray ? 'bg-indigo-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.minimizeToTray ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Connection</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video Quality</label>
              <select
                value={settings.quality}
                onChange={(e) => handleChange('quality', e.target.value)}
                className="input"
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="high">High (Best quality)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="low">Low (Fastest)</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Clipboard sync</p>
                <p className="text-sm text-gray-400">Sync clipboard between devices during sessions</p>
              </div>
              <button
                onClick={() => handleChange('enableClipboardSync', !settings.enableClipboardSync)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableClipboardSync ? 'bg-indigo-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.enableClipboardSync ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">File transfer</p>
                <p className="text-sm text-gray-400">Allow file transfers during sessions</p>
              </div>
              <button
                onClick={() => handleChange('enableFileTransfer', !settings.enableFileTransfer)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableFileTransfer ? 'bg-indigo-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.enableFileTransfer ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Unattended access</p>
                <p className="text-sm text-gray-400">Allow connections without manual approval</p>
              </div>
              <button
                onClick={() => handleChange('allowUnattendedAccess', !settings.allowUnattendedAccess)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.allowUnattendedAccess ? 'bg-indigo-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.allowUnattendedAccess ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {settings.allowUnattendedAccess && (
              <div className="animate-slideIn">
                <label className="block text-sm font-medium text-gray-300 mb-2">Unattended Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.unattendedPassword}
                    onChange={(e) => handleChange('unattendedPassword', e.target.value)}
                    className="input pr-12"
                    placeholder="Set a secure password"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters recommended</p>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Advanced</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Server URL</label>
              <input
                type="text"
                value={settings.serverUrl}
                onChange={(e) => handleChange('serverUrl', e.target.value)}
                className="input"
                placeholder="http://localhost:3000"
              />
              <p className="text-xs text-gray-500 mt-1">Change only if using a custom server</p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">About</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Build</span>
              <span className="text-white">2024.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
