import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as os from 'os';
import * as path from 'path';
import { SignalingService } from './services/SignalingService';
import { AuthService } from './services/AuthService';
import { DeviceService } from './services/DeviceService';
import { FileTransferService } from './services/FileTransferService';
import { LANDiscoveryService } from './services/LANDiscoveryService';
import { Logger } from './utils/Logger';
import { RateLimiter } from './middleware/RateLimiter';
import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import sessionRoutes from './routes/sessions';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for file transfers
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;
const logger = new Logger('Server');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(RateLimiter.middleware());

// Services
const authService = new AuthService();
const deviceService = new DeviceService();
const fileTransferService = new FileTransferService();
const signalingService = new SignalingService(io, deviceService, authService, fileTransferService);
const lanDiscovery = new LANDiscoveryService();

// REST API Routes
app.use('/api/auth', authRoutes(authService));
app.use('/api/devices', deviceRoutes(deviceService, authService));
app.use('/api/sessions', sessionRoutes(authService));

// Serve the web UI at root
app.get('/', (req, res) => {
  const localIPs = getLocalIPs();
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwiftConnect - Remote Desktop</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    .glass { background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); }
    .id-font { font-family: 'Monaco', 'Menlo', monospace; letter-spacing: 3px; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pulse { animation: pulse 2s infinite; }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white">
  <div class="container mx-auto px-4 py-8 max-w-4xl" id="mainView">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <h1 class="text-4xl font-bold mb-2">SwiftConnect</h1>
      <p class="text-gray-400">Remote Desktop & File Sharing</p>
      <div class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full">
        <span class="w-2 h-2 bg-emerald-400 rounded-full pulse"></span>
        <span class="text-emerald-400 text-sm">Server Online - LAN Mode</span>
      </div>
    </div>

    <!-- Status -->
    <div id="status" class="glass rounded-xl p-4 mb-6 border border-gray-700">
      <div class="flex items-center gap-3">
        <span id="statusIcon">⏳</span>
        <span id="statusText">Connecting to server...</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button onclick="showTab('home')" class="tab-btn px-6 py-3 rounded-xl bg-indigo-500 text-white" data-tab="home">Your Device</button>
      <button onclick="showTab('connect')" class="tab-btn px-6 py-3 rounded-xl bg-gray-700 text-gray-300" data-tab="connect">Connect</button>
    </div>

    <!-- Home Tab -->
    <div id="homeTab" class="glass rounded-xl p-6 border border-gray-700">
      <h2 class="text-xl font-semibold mb-4">Your Connection Info</h2>
      <p class="text-gray-400 mb-6">Share this with others on your network to let them connect:</p>

      <div class="bg-slate-900/50 rounded-xl p-6 text-center mb-6">
        <div class="text-sm text-gray-400 mb-2">Your ID</div>
        <div id="myId" class="id-font text-3xl font-bold text-indigo-400 mb-4">--- --- ---</div>
        <div class="text-sm text-gray-400 mb-2">Password</div>
        <div id="myPass" class="id-font text-2xl font-bold text-amber-400">------</div>
      </div>

      <div class="flex gap-3 justify-center">
        <button onclick="copyId()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">📋 Copy ID</button>
        <button onclick="copyPass()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">📋 Copy Password</button>
      </div>

      <div class="grid grid-cols-4 gap-3 mt-6">
        <div class="bg-slate-900/30 rounded-lg p-3 text-center"><div class="text-xl mb-1">🔒</div><div class="text-xs text-gray-400">Encrypted</div></div>
        <div class="bg-slate-900/30 rounded-lg p-3 text-center"><div class="text-xl mb-1">📁</div><div class="text-xs text-gray-400">File Transfer</div></div>
        <div class="bg-slate-900/30 rounded-lg p-3 text-center"><div class="text-xl mb-1">⚡</div><div class="text-xs text-gray-400">Fast</div></div>
        <div class="bg-slate-900/30 rounded-lg p-3 text-center"><div class="text-xl mb-1">🌐</div><div class="text-xs text-gray-400">LAN Mode</div></div>
      </div>
    </div>

    <!-- Connect Tab -->
    <div id="connectTab" class="glass rounded-xl p-6 border border-gray-700 hidden">
      <h2 class="text-xl font-semibold mb-4">Connect to Partner</h2>
      <p class="text-gray-400 mb-6">Enter your partner's ID and password:</p>

      <div class="space-y-4">
        <input type="text" id="targetId" placeholder="XXX XXX XXX" maxlength="11"
          class="w-full px-4 py-4 bg-slate-900 border border-gray-600 rounded-xl text-center text-xl id-font focus:border-indigo-500 focus:outline-none"
          oninput="formatIdInput(this)">
        <input type="text" id="targetPass" placeholder="PASSWORD" maxlength="6"
          class="w-full px-4 py-4 bg-slate-900 border border-gray-600 rounded-xl text-center text-xl id-font uppercase focus:border-indigo-500 focus:outline-none">
        <div id="error" class="hidden p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-center"></div>
        <button onclick="connect()" id="connectBtn" class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold text-lg">
          🚀 Connect
        </button>
      </div>
    </div>
  </div>

  <!-- Session View (Hidden by default) -->
  <div id="sessionView" class="fixed inset-0 bg-black hidden flex-col">
    <div class="bg-slate-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <span class="w-3 h-3 bg-emerald-400 rounded-full pulse"></span>
        <span id="connectedTo">Connected</span>
      </div>
      <button onclick="endSession()" class="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg">End Session</button>
    </div>
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-6xl mb-4">🖥️</div>
        <div class="text-xl mb-2">Remote Session Active</div>
        <div class="text-gray-400">Screen sharing would display here</div>
      </div>
    </div>
  </div>

  <!-- Incoming Modal -->
  <div id="incomingModal" class="fixed inset-0 bg-black/80 hidden items-center justify-center">
    <div class="bg-slate-800 rounded-2xl p-8 max-w-sm text-center">
      <div class="text-5xl mb-4">📞</div>
      <div class="text-xl font-semibold mb-2">Incoming Connection</div>
      <div class="text-gray-400 mb-6"><strong id="incomingName">Someone</strong> wants to connect</div>
      <div class="flex gap-3 justify-center">
        <button onclick="reject()" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Decline</button>
        <button onclick="accept()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl">Accept</button>
      </div>
    </div>
  </div>

  <script>
    let socket, deviceInfo = {}, pending = null;

    function formatId(id) { return id ? id.replace(/(\\d{3})(\\d{3})(\\d{3})/, '$1 $2 $3') : '--- --- ---'; }
    function formatIdInput(el) {
      const d = el.value.replace(/\\D/g, '').slice(0, 9);
      el.value = d.replace(/(\\d{3})(?=\\d)/g, '$1 ');
    }

    function showTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('bg-indigo-500', b.dataset.tab === tab);
        b.classList.toggle('bg-gray-700', b.dataset.tab !== tab);
      });
      document.getElementById('homeTab').classList.toggle('hidden', tab !== 'home');
      document.getElementById('connectTab').classList.toggle('hidden', tab !== 'connect');
    }

    function setStatus(icon, text, type) {
      document.getElementById('statusIcon').textContent = icon;
      document.getElementById('statusText').textContent = text;
      const s = document.getElementById('status');
      s.className = 'glass rounded-xl p-4 mb-6 border ' +
        (type === 'success' ? 'border-emerald-500/50 bg-emerald-500/10' :
         type === 'error' ? 'border-red-500/50 bg-red-500/10' : 'border-gray-700');
    }

    function copyId() { navigator.clipboard.writeText(deviceInfo.displayId || ''); alert('ID copied!'); }
    function copyPass() { navigator.clipboard.writeText(deviceInfo.sessionPassword || ''); alert('Password copied!'); }

    function connect() {
      const id = document.getElementById('targetId').value.replace(/\\s/g, '');
      const pass = document.getElementById('targetPass').value.toUpperCase();
      if (id.length !== 9) return showError('Enter valid 9-digit ID');
      if (!pass) return showError('Enter password');

      document.getElementById('connectBtn').disabled = true;
      document.getElementById('connectBtn').textContent = '⏳ Connecting...';
      hideError();

      socket.emit('request-connection', { targetDisplayId: id, password: pass }, (r) => {
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('connectBtn').textContent = '🚀 Connect';
        if (!r.success) showError(r.error || 'Connection failed');
      });
    }

    function showError(msg) { const e = document.getElementById('error'); e.textContent = msg; e.classList.remove('hidden'); }
    function hideError() { document.getElementById('error').classList.add('hidden'); }

    function accept() {
      if (pending) {
        socket.emit('accept-connection', { sourceDeviceId: pending.sourceDeviceId });
        document.getElementById('connectedTo').textContent = 'Connected to ' + pending.sourceDeviceName;
        document.getElementById('sessionView').classList.remove('hidden');
        document.getElementById('sessionView').classList.add('flex');
      }
      document.getElementById('incomingModal').classList.add('hidden');
      pending = null;
    }

    function reject() {
      if (pending) socket.emit('reject-connection', { sourceDeviceId: pending.sourceDeviceId });
      document.getElementById('incomingModal').classList.add('hidden');
      pending = null;
    }

    function endSession() {
      socket.emit('end-session');
      document.getElementById('sessionView').classList.add('hidden');
      document.getElementById('sessionView').classList.remove('flex');
    }

    // Connect to server
    socket = io();

    socket.on('connect', () => {
      setStatus('✅', 'Connected to server', 'success');
      socket.emit('register-device', {
        deviceName: navigator.platform || 'Web Browser',
        deviceType: 'web', platform: 'web', version: '1.0.0'
      }, (r) => {
        if (r.success) {
          deviceInfo = r;
          document.getElementById('myId').textContent = formatId(r.displayId);
          document.getElementById('myPass').textContent = r.sessionPassword;
        }
      });
    });

    socket.on('disconnect', () => setStatus('❌', 'Disconnected', 'error'));
    socket.on('connect_error', () => setStatus('❌', 'Connection failed', 'error'));

    socket.on('incoming-connection', (data) => {
      pending = data;
      document.getElementById('incomingName').textContent = data.sourceDeviceName;
      document.getElementById('incomingModal').classList.remove('hidden');
      document.getElementById('incomingModal').classList.add('flex');
    });

    socket.on('connection-accepted', (data) => {
      document.getElementById('connectedTo').textContent = 'Connected to ' + data.targetDeviceName;
      document.getElementById('sessionView').classList.remove('hidden');
      document.getElementById('sessionView').classList.add('flex');
    });

    socket.on('connection-rejected', (data) => showError('Rejected: ' + (data.reason || 'Unknown')));
    socket.on('session-ended', () => { document.getElementById('sessionView').classList.add('hidden'); document.getElementById('sessionView').classList.remove('flex'); });
    socket.on('peer-disconnected', () => { document.getElementById('sessionView').classList.add('hidden'); alert('Partner disconnected'); });
  </script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    connections: signalingService.getConnectionCount(),
  });
});

// TURN credentials endpoint
app.get('/api/turn-credentials', (req, res) => {
  const credentials = {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      process.env.TURN_SERVER_URL || 'turn:turn.swiftconnect.io:3478',
    ],
    username: process.env.TURN_USERNAME || 'swiftconnect',
    credential: process.env.TURN_CREDENTIAL || 'swiftconnect-credential',
  };
  res.json(credentials);
});

// LAN Discovery endpoints
app.get('/api/lan/devices', (req, res) => {
  res.json({
    devices: lanDiscovery.getDevices(),
    localIPs: lanDiscovery.getLocalIPs(),
  });
});

app.get('/api/lan/info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const localIPs: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;
    for (const net of nets) {
      if (net.internal || net.family !== 'IPv4') continue;
      localIPs.push(net.address);
    }
  }

  res.json({
    hostname: os.hostname(),
    localIPs,
    port: PORT,
    lanMode: true,
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Get local IPs for display
function getLocalIPs(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;
    for (const net of nets) {
      if (net.internal || net.family !== 'IPv4') continue;
      ips.push(net.address);
    }
  }
  return ips;
}

// Start server on 0.0.0.0 for LAN access
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  logger.info(`SwiftConnect Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`LAN Mode: Enabled`);
  logger.info(`Local access: http://localhost:${PORT}`);
  localIPs.forEach(ip => {
    logger.info(`LAN access: http://${ip}:${PORT}`);
  });

  // Start LAN discovery after server is ready
  // This will be started when first device registers
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io, httpServer };
