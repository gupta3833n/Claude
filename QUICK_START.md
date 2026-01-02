# SwiftConnect - Quick Start Guide

## Testing the Application

### Option 1: Quick Test (No Build Required)

**Step 1: Start the Server**
```bash
# On Linux/Mac:
./start-server.sh

# On Windows:
start-server.bat

# Or manually:
cd server
npm install
npm run build
node dist/index.js
```

**Step 2: Open the Web Demo**
- Open `SwiftConnect-Demo.html` in your browser
- You'll see your unique 9-digit ID and password
- Open the same file in another browser/tab to test connecting

### Option 2: Using Docker (Recommended for Production)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Then open http://localhost in your browser.

---

## How to Connect Two Devices

### Device A (Host - the computer to be controlled):
1. Start the server: `./start-server.sh`
2. Open `SwiftConnect-Demo.html`
3. Note your **ID** (e.g., `123 456 789`) and **Password** (e.g., `ABC123`)
4. Share these with Device B

### Device B (Client - the controller):
1. Open `SwiftConnect-Demo.html`
2. Click "Connect to Partner"
3. Enter Device A's ID and Password
4. Click Connect
5. Device A will get a popup to accept/reject
6. Once accepted, you're connected!

---

## Building Desktop Application

### Prerequisites
- Node.js 18+
- npm

### Build for Windows
```bash
cd desktop
npm install
npm run package:win
```
The `.exe` will be in `desktop/release/`

### Build for macOS
```bash
cd desktop
npm install
npm run package:mac
```
The `.dmg` will be in `desktop/release/`

### Build for Linux
```bash
cd desktop
npm install
npm run package:linux
```
The `.AppImage` and `.deb` will be in `desktop/release/`

---

## Building Mobile App

### Android
```bash
cd mobile
npm install
npx react-native run-android
```

### iOS (Mac only)
```bash
cd mobile
npm install
cd ios && pod install && cd ..
npx react-native run-ios
```

---

## Project Structure

```
swiftconnect/
├── server/              # Backend server (Node.js)
├── desktop/             # Desktop app (Electron)
├── mobile/              # Mobile app (React Native)
├── web/                 # Web client (React)
├── SwiftConnect-Demo.html  # Standalone demo (no build needed)
├── start-server.sh      # Server launcher (Linux/Mac)
├── start-server.bat     # Server launcher (Windows)
└── docker-compose.yml   # Docker deployment
```

---

## Troubleshooting

### Server won't start
- Make sure port 3000 is available
- Check Node.js is installed: `node --version`

### Can't connect to partner
- Both devices must be connected to the server
- Check ID and password are correct
- Make sure firewall allows connections

### Electron build fails
- Try: `npm cache clean --force`
- Delete `node_modules` and reinstall
- Make sure you have enough disk space

---

## Features

| Feature | Status |
|---------|--------|
| Remote Desktop | ✅ |
| File Transfer (up to 4GB) | ✅ |
| Clipboard Sync | ✅ |
| Chat | ✅ |
| End-to-End Encryption | ✅ |
| Cross-Platform | ✅ |
| Unattended Access | ✅ |
| Multi-Monitor | ✅ |

---

## Need Help?

Open an issue at: https://github.com/swiftconnect/swiftconnect/issues
