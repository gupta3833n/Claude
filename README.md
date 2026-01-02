# SwiftConnect - Remote Desktop & File Sharing

A fast, secure, cross-platform remote desktop application with file sharing capabilities. Works on Windows, macOS, Linux, Android, and iOS.

## Features

### Core Features (Best of TeamViewer, AnyDesk & UltraViewer)
- **Remote Desktop Control** - Full screen sharing with low latency
- **File Transfer** - Drag & drop file sharing up to 4GB
- **Cross-Platform** - Desktop agents for Windows/macOS/Linux, mobile apps for iOS/Android
- **Instant Connect** - No account required, just share your 9-digit ID
- **Unattended Access** - Set up permanent access to your devices
- **Multi-Monitor Support** - Switch between monitors seamlessly
- **Clipboard Sync** - Copy/paste between devices
- **Chat** - Built-in text chat during sessions
- **Session Recording** - Record sessions for later review
- **Wake-on-LAN** - Wake up sleeping computers remotely

### Security Features
- **End-to-End Encryption** - AES-256 encryption for all data
- **Two-Factor Authentication** - Optional 2FA for enhanced security
- **Dynamic Passwords** - Auto-generated session passwords
- **Whitelist/Blacklist** - Control who can connect
- **Session Logs** - Complete audit trail of all connections

### Performance Features
- **Adaptive Quality** - Auto-adjusts based on connection speed
- **Hardware Acceleration** - Uses GPU for encoding/decoding
- **P2P Connection** - Direct connection when possible (no relay)
- **Low Bandwidth Mode** - Works on slow connections (< 1Mbps)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SwiftConnect Cloud                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Signaling  │  │    TURN     │  │    API Server       │  │
│  │   Server    │  │   Server    │  │  (Auth, Sessions)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
     ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
     │   Desktop   │ │   Mobile    │ │     Web     │
     │    Agent    │ │     App     │ │   Client    │
     │ (Host/View) │ │  (Viewer)   │ │  (Viewer)   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

## Quick Start

### 1. Start the Server
```bash
cd server
npm install
npm start
```

### 2. Run Desktop Agent
```bash
cd desktop
npm install
npm start
```

### 3. Run Mobile App
```bash
cd mobile
npm install
npx react-native run-android  # For Android
npx react-native run-ios      # For iOS
```

## Project Structure

```
swiftconnect/
├── server/              # Signaling & API server
├── desktop/             # Electron desktop agent
├── mobile/              # React Native mobile app
├── web/                 # Web viewer client
├── shared/              # Shared utilities & types
└── docs/                # Documentation
```

## Technology Stack

- **Server**: Node.js, Express, Socket.io, Redis
- **Desktop**: Electron, WebRTC, RobotJS
- **Mobile**: React Native, WebRTC
- **Web**: React, WebRTC
- **Security**: TweetNaCl, AES-256, DTLS-SRTP

## License

MIT License - Free for personal and commercial use.
