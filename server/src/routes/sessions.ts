import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export default function sessionRoutes(authService: AuthService): Router {
  const router = Router();

  // Middleware to authenticate requests
  const authenticate = async (req: Request, res: Response, next: Function) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).user = user;
    next();
  };

  // Get session history for a device
  router.get('/history/:deviceId', authenticate, async (req: Request, res: Response) => {
    try {
      const sessions = await authService.getSessionHistory(req.params.deviceId);
      res.json({ sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get session by ID
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const session = await authService.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ session });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
