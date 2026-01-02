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
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwiftConnect - Remote Desktop</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
    }
    .container { max-width: 500px; margin: 0 auto; padding: 30px 20px; }

    /* Header */
    .header { text-align: center; margin-bottom: 30px; }
    .logo {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 15px;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
    }
    .logo-icon { font-size: 36px; }
    h1 { font-size: 32px; font-weight: 700; margin-bottom: 5px; }
    .subtitle { color: #a0aec0; font-size: 14px; }

    /* Status Badge */
    .status-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 8px 16px; border-radius: 50px;
      margin-top: 15px;
    }
    .status-dot {
      width: 8px; height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .status-text { color: #10b981; font-size: 13px; font-weight: 500; }

    /* Connection Status */
    .conn-status {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex; align-items: center; gap: 10px;
    }
    .conn-status.success { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
    .conn-status.error { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }

    /* Tabs */
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab-btn {
      flex: 1; padding: 14px 20px;
      border: none; border-radius: 12px;
      font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.3s;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .tab-btn.inactive { background: rgba(255,255,255,0.08); color: #a0aec0; }
    .tab-btn:hover { transform: translateY(-2px); }

    /* Cards */
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 25px;
      backdrop-filter: blur(10px);
    }
    .card-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .card-subtitle { color: #a0aec0; font-size: 13px; margin-bottom: 20px; }

    /* ID Display */
    .id-box {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border: 2px solid rgba(102, 126, 234, 0.3);
      border-radius: 16px;
      padding: 25px;
      text-align: center;
      margin-bottom: 20px;
    }
    .id-label { color: #a0aec0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .id-value {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 32px; font-weight: 700;
      letter-spacing: 4px;
      color: #667eea;
      margin-bottom: 20px;
    }
    .pass-value {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 24px; font-weight: 700;
      letter-spacing: 3px;
      color: #f59e0b;
    }

    /* Buttons */
    .btn-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
    .btn {
      padding: 10px 20px;
      border: none; border-radius: 10px;
      font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.3s;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      padding: 16px;
      font-size: 16px;
      width: 100%;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; }

    /* Features */
    .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .feature {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 15px 10px;
      text-align: center;
    }
    .feature-icon { font-size: 24px; margin-bottom: 6px; }
    .feature-text { font-size: 11px; color: #a0aec0; }

    /* Input */
    .input-group { margin-bottom: 15px; }
    .input {
      width: 100%;
      padding: 16px;
      background: rgba(0,0,0,0.3);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 18px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      text-align: center;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .input:focus { outline: none; border-color: #667eea; }
    .input::placeholder { color: #4a5568; letter-spacing: 2px; }

    /* Error */
    .error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      padding: 12px;
      color: #fca5a5;
      text-align: center;
      margin-bottom: 15px;
      display: none;
    }
    .error.show { display: block; }

    /* Hidden */
    .hidden { display: none !important; }

    /* Session View */
    .session-view {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: #0f0f1a;
      display: none; flex-direction: column;
    }
    .session-view.active { display: flex; }
    .session-header {
      background: #1a1a2e;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding: 15px 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .session-info { display: flex; align-items: center; gap: 10px; }
    .session-content {
      flex: 1; display: flex; align-items: center; justify-content: center;
    }
    .session-placeholder { text-align: center; }
    .session-icon { font-size: 80px; margin-bottom: 20px; }
    .session-title { font-size: 24px; margin-bottom: 10px; }
    .session-subtitle { color: #a0aec0; }

    /* Modal */
    .modal {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: none; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 30px;
      text-align: center;
      max-width: 350px;
      width: 100%;
    }
    .modal-icon { font-size: 60px; margin-bottom: 15px; }
    .modal-title { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
    .modal-subtitle { color: #a0aec0; margin-bottom: 25px; }
    .modal-buttons { display: flex; gap: 12px; justify-content: center; }
    .modal-buttons .btn { flex: 1; padding: 14px; }

    /* Network Info */
    .network-info {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 10px;
      padding: 12px;
      margin-top: 15px;
      font-size: 12px;
      color: #a0aec0;
    }
    .network-info strong { color: #667eea; }
  </style>
</head>
<body>
  <div class="container" id="mainView">
    <!-- Header -->
    <div class="header">
      <div class="logo"><span class="logo-icon">🖥️</span></div>
      <h1>SwiftConnect</h1>
      <p class="subtitle">Remote Desktop & File Sharing</p>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span class="status-text">Server Online - LAN Mode</span>
      </div>
    </div>

    <!-- Connection Status -->
    <div class="conn-status" id="status">
      <span id="statusIcon">⏳</span>
      <span id="statusText">Connecting to server...</span>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn active" id="tabHome" onclick="showTab('home')">📱 Your Device</button>
      <button class="tab-btn inactive" id="tabConnect" onclick="showTab('connect')">🔗 Connect</button>
    </div>

    <!-- Home Tab -->
    <div class="card" id="homeTab">
      <div class="card-title">Your Connection Info</div>
      <div class="card-subtitle">Share this with others on your network to connect</div>

      <div class="id-box">
        <div class="id-label">Your ID</div>
        <div class="id-value" id="myId">--- --- ---</div>
        <div class="id-label">Password</div>
        <div class="pass-value" id="myPass">------</div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="copyId()">📋 Copy ID</button>
        <button class="btn btn-secondary" onclick="copyPass()">🔑 Copy Password</button>
      </div>

      <div class="features">
        <div class="feature"><div class="feature-icon">🔒</div><div class="feature-text">Encrypted</div></div>
        <div class="feature"><div class="feature-icon">📁</div><div class="feature-text">File Transfer</div></div>
        <div class="feature"><div class="feature-icon">⚡</div><div class="feature-text">Fast</div></div>
        <div class="feature"><div class="feature-icon">🌐</div><div class="feature-text">LAN Mode</div></div>
      </div>

      <div class="network-info">
        <strong>LAN Access:</strong> Other devices on your network can connect at:<br>
        ${localIPs.map(ip => '<strong>http://' + ip + ':' + PORT + '</strong>').join(' or ')}
      </div>
    </div>

    <!-- Connect Tab -->
    <div class="card hidden" id="connectTab">
      <div class="card-title">Connect to Partner</div>
      <div class="card-subtitle">Enter partner's ID and password to connect</div>

      <div class="input-group">
        <input type="text" class="input" id="targetId" placeholder="XXX XXX XXX" maxlength="11" oninput="formatIdInput(this)">
      </div>
      <div class="input-group">
        <input type="text" class="input" id="targetPass" placeholder="PASSWORD" maxlength="6">
      </div>

      <div class="error" id="error"></div>

      <button class="btn btn-primary" id="connectBtn" onclick="connect()">
        🚀 Connect to Partner
      </button>
    </div>
  </div>

  <!-- Session View -->
  <div class="session-view" id="sessionView">
    <div class="session-header">
      <div class="session-info">
        <span class="status-dot"></span>
        <span id="connectedTo">Connected</span>
      </div>
      <button class="btn btn-danger" onclick="endSession()">✕ End Session</button>
    </div>
    <div class="session-content">
      <div class="session-placeholder">
        <div class="session-icon">🖥️</div>
        <div class="session-title">Remote Session Active</div>
        <div class="session-subtitle">Screen sharing would display here</div>
      </div>
    </div>
  </div>

  <!-- Incoming Connection Modal -->
  <div class="modal" id="incomingModal">
    <div class="modal-content">
      <div class="modal-icon">📞</div>
      <div class="modal-title">Incoming Connection</div>
      <div class="modal-subtitle"><strong id="incomingName">Someone</strong> wants to connect to your device</div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" onclick="reject()">✕ Decline</button>
        <button class="btn btn-primary" style="box-shadow:none" onclick="accept()">✓ Accept</button>
      </div>
    </div>
  </div>

  <script>
    let socket, deviceInfo = {}, pending = null;

    function formatId(id) {
      if (!id) return '--- --- ---';
      return id.toString().replace(/(\\d{3})(\\d{3})(\\d{3})/, '$1 $2 $3');
    }

    function formatIdInput(el) {
      let digits = el.value.replace(/\\D/g, '').slice(0, 9);
      el.value = digits.replace(/(\\d{3})(?=\\d)/g, '$1 ');
    }

    function showTab(tab) {
      document.getElementById('tabHome').className = 'tab-btn ' + (tab === 'home' ? 'active' : 'inactive');
      document.getElementById('tabConnect').className = 'tab-btn ' + (tab === 'connect' ? 'active' : 'inactive');
      document.getElementById('homeTab').classList.toggle('hidden', tab !== 'home');
      document.getElementById('connectTab').classList.toggle('hidden', tab !== 'connect');
    }

    function setStatus(icon, text, type) {
      document.getElementById('statusIcon').textContent = icon;
      document.getElementById('statusText').textContent = text;
      const el = document.getElementById('status');
      el.className = 'conn-status' + (type ? ' ' + type : '');
    }

    function copyId() {
      if (deviceInfo.displayId) {
        navigator.clipboard.writeText(deviceInfo.displayId);
        alert('ID copied: ' + deviceInfo.displayId);
      }
    }

    function copyPass() {
      if (deviceInfo.sessionPassword) {
        navigator.clipboard.writeText(deviceInfo.sessionPassword);
        alert('Password copied!');
      }
    }

    function showError(msg) {
      const el = document.getElementById('error');
      el.textContent = msg;
      el.classList.add('show');
    }

    function hideError() {
      document.getElementById('error').classList.remove('show');
    }

    function connect() {
      const id = document.getElementById('targetId').value.replace(/\\s/g, '');
      const pass = document.getElementById('targetPass').value.toUpperCase();

      if (id.length !== 9) { showError('Please enter a valid 9-digit ID'); return; }
      if (!pass) { showError('Please enter the password'); return; }

      hideError();
      const btn = document.getElementById('connectBtn');
      btn.disabled = true;
      btn.innerHTML = '⏳ Connecting...';

      socket.emit('request-connection', { targetDisplayId: id, password: pass }, function(res) {
        btn.disabled = false;
        btn.innerHTML = '🚀 Connect to Partner';
        if (!res.success) showError(res.error || 'Connection failed');
      });
    }

    function accept() {
      if (pending) {
        socket.emit('accept-connection', { sourceDeviceId: pending.sourceDeviceId });
        document.getElementById('connectedTo').textContent = 'Connected to ' + pending.sourceDeviceName;
        document.getElementById('sessionView').classList.add('active');
      }
      document.getElementById('incomingModal').classList.remove('active');
      pending = null;
    }

    function reject() {
      if (pending) socket.emit('reject-connection', { sourceDeviceId: pending.sourceDeviceId });
      document.getElementById('incomingModal').classList.remove('active');
      pending = null;
    }

    function endSession() {
      socket.emit('end-session');
      document.getElementById('sessionView').classList.remove('active');
    }

    // Initialize Socket.IO
    socket = io();

    socket.on('connect', function() {
      setStatus('✅', 'Connected to server', 'success');
      socket.emit('register-device', {
        deviceName: navigator.platform || 'Web Browser',
        deviceType: 'web',
        platform: 'web',
        version: '1.0.0'
      }, function(res) {
        if (res.success) {
          deviceInfo = res;
          document.getElementById('myId').textContent = formatId(res.displayId);
          document.getElementById('myPass').textContent = res.sessionPassword;
        }
      });
    });

    socket.on('disconnect', function() {
      setStatus('❌', 'Disconnected from server', 'error');
    });

    socket.on('connect_error', function() {
      setStatus('❌', 'Connection failed', 'error');
    });

    socket.on('incoming-connection', function(data) {
      pending = data;
      document.getElementById('incomingName').textContent = data.sourceDeviceName;
      document.getElementById('incomingModal').classList.add('active');
    });

    socket.on('connection-accepted', function(data) {
      document.getElementById('connectedTo').textContent = 'Connected to ' + data.targetDeviceName;
      document.getElementById('sessionView').classList.add('active');
    });

    socket.on('connection-rejected', function(data) {
      showError('Connection rejected: ' + (data.reason || 'Unknown reason'));
    });

    socket.on('session-ended', function() {
      document.getElementById('sessionView').classList.remove('active');
    });

    socket.on('peer-disconnected', function() {
      document.getElementById('sessionView').classList.remove('active');
      alert('Partner disconnected');
    });
  </script>
</body>
</html>`);
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
