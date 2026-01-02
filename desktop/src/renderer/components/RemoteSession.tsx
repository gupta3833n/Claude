import React, { useState, useRef, useEffect } from 'react';

interface RemoteSessionProps {
  deviceName: string;
  onEndSession: () => void;
  onToggleChat: () => void;
}

const RemoteSession: React.FC<RemoteSessionProps> = ({ deviceName, onEndSession, onToggleChat }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState<'auto' | 'high' | 'medium' | 'low'>('auto');
  const [stats, setStats] = useState({ fps: 0, latency: 0, bandwidth: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Set up event listeners for receiving video frames
    window.electronAPI.onSignal((data) => {
      if (data.type === 'video-frame') {
        renderFrame(data.data);
      }
    });

    // Hide controls after inactivity
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    document.addEventListener('mousemove', resetControlsTimeout);

    return () => {
      document.removeEventListener('mousemove', resetControlsTimeout);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const renderFrame = (frameData: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create image from frame data
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${frameData.data}`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    window.electronAPI.setSetting('lastMousePos', { x, y });
    // In real implementation, send input event
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Send click event
    console.log('Click at', x, y);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-black relative">
      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-medium">{deviceName}</span>
              <span className="text-gray-400 text-sm">• Connected</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">
                {stats.fps} FPS • {stats.latency}ms • {stats.bandwidth} Mbps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Canvas */}
      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full cursor-none"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* Placeholder when no video */}
        {!canvasRef.current?.width && (
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400">Waiting for screen...</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-center gap-2">
            {/* Quality Selector */}
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700"
            >
              <option value="auto">Auto Quality</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="w-px h-8 bg-gray-700 mx-2" />

            {/* Clipboard Sync */}
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors group" title="Sync Clipboard">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>

            {/* File Transfer */}
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors group" title="Send File">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>

            {/* Chat */}
            <button
              onClick={onToggleChat}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors group"
              title="Chat"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            <div className="w-px h-8 bg-gray-700 mx-2" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors group"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* End Session */}
            <button
              onClick={onEndSession}
              className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteSession;
