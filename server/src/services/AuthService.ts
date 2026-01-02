import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: number;
  lastLogin: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  devices: string[];
}

interface Session {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  transferredBytes: number;
  status: 'active' | 'completed' | 'terminated';
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private logger = new Logger('AuthService');
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  }

  async register(email: string, password: string, name: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Check if user already exists
    for (const user of this.users.values()) {
      if (user.email === email) {
        throw new Error('User already exists');
      }
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    const user: User = {
      id,
      email,
      passwordHash,
      name,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      twoFactorEnabled: false,
      devices: [],
    };

    this.users.set(id, user);

    const token = this.generateToken(user);

    this.logger.info(`User registered: ${email}`);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    let foundUser: User | undefined;

    for (const user of this.users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    foundUser.lastLogin = Date.now();
    this.users.set(foundUser.id, foundUser);

    const token = this.generateToken(foundUser);

    this.logger.info(`User logged in: ${email}`);

    const { passwordHash: _, ...safeUser } = foundUser;
    return { user: safeUser, token };
  }

  async verifyToken(token: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      const user = this.users.get(decoded.userId);
      if (!user) {
        return null;
      }
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    } catch {
      return null;
    }
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async linkDevice(userId: string, deviceId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    if (!user.devices.includes(deviceId)) {
      user.devices.push(deviceId);
      this.users.set(userId, user);
    }
    return true;
  }

  async unlinkDevice(userId: string, deviceId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.devices = user.devices.filter((d) => d !== deviceId);
    this.users.set(userId, user);
    return true;
  }

  async getUserDevices(userId: string): Promise<string[]> {
    const user = this.users.get(userId);
    return user?.devices || [];
  }

  // Session management
  async createSession(sourceDeviceId: string, targetDeviceId: string): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      sourceDeviceId,
      targetDeviceId,
      startTime: Date.now(),
      transferredBytes: 0,
      status: 'active',
    };

    this.sessions.set(session.id, session);
    this.logger.info(`Session created: ${session.id}`);
    return session;
  }

  async endSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = 'completed';
    this.sessions.set(sessionId, session);

    this.logger.info(`Session ended: ${sessionId}, duration: ${session.duration}ms`);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionHistory(deviceId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (s) => s.sourceDeviceId === deviceId || s.targetDeviceId === deviceId
    );
  }

  async updateSessionBytes(sessionId: string, bytes: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transferredBytes += bytes;
      this.sessions.set(sessionId, session);
    }
  }

  async enable2FA(userId: string, secret: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    this.users.set(userId, user);
    return true;
  }

  async disable2FA(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    this.users.set(userId, user);
    return true;
  }

  async getUser(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
