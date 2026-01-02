import React, { useState, useEffect } from 'react';

interface IncomingConnection {
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceType: string;
}

interface IncomingConnectionModalProps {
  connection: IncomingConnection;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingConnectionModal: React.FC<IncomingConnectionModalProps> = ({
  connection,
  onAccept,
  onReject,
}) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});

    return () => clearInterval(timer);
  }, [onReject]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'tablet':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slideIn">
        {/* Header */}
        <div className="bg-indigo-500 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center text-white">
            {getDeviceIcon(connection.sourceDeviceType)}
          </div>
          <h2 className="text-xl font-bold text-white">Incoming Connection</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-center text-gray-300 mb-6">
            <span className="font-semibold text-white">{connection.sourceDeviceName}</span>
            <br />
            <span className="text-sm">wants to connect to your computer</span>
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="4"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (125.6 * countdown) / 30}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                {countdown}
              </span>
            </div>
            <span className="text-gray-400 text-sm">seconds remaining</span>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
            <p className="text-amber-200 text-sm text-center">
              Only accept connections from people you know and trust
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 btn btn-outline py-3"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 btn btn-success py-3"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingConnectionModal;
