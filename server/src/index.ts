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
