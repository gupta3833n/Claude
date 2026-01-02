import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { RateLimiter } from '../middleware/RateLimiter';

export default function authRoutes(authService: AuthService): Router {
  const router = Router();

  // Register new user
  router.post('/register', RateLimiter.strictMiddleware(5, 3600), async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const result = await authService.register(email, password, name);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login
  router.post('/login', RateLimiter.strictMiddleware(10, 60), async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Verify token
  router.get('/verify', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Get current user
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Enable 2FA
  router.post('/2fa/enable', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const { secret } = req.body;

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      await authService.enable2FA(user.id, secret);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Disable 2FA
  router.post('/2fa/disable', async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      await authService.disable2FA(user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
