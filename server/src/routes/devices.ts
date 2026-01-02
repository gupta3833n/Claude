import { Router, Request, Response } from 'express';
import { DeviceService } from '../services/DeviceService';
import { AuthService } from '../services/AuthService';

export default function deviceRoutes(deviceService: DeviceService, authService: AuthService): Router {
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

  // Get all devices for authenticated user
  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const deviceIds = await authService.getUserDevices(user.id);
      const devices = await Promise.all(
        deviceIds.map((id) => deviceService.getDevice(id))
      );
      res.json({ devices: devices.filter(Boolean) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get device by ID
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const device = await deviceService.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ device });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Link device to account
  router.post('/link', authenticate, async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      const user = (req as any).user;

      const device = await deviceService.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      await authService.linkDevice(user.id, deviceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unlink device from account
  router.post('/unlink', authenticate, async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      const user = (req as any).user;

      await authService.unlinkDevice(user.id, deviceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update device settings
  router.patch('/:id/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const device = await deviceService.updateDeviceSettings(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ device });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set unattended access
  router.post('/:id/unattended', authenticate, async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const success = await deviceService.setUnattendedAccess(req.params.id, password);
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Disable unattended access
  router.delete('/:id/unattended', authenticate, async (req: Request, res: Response) => {
    try {
      const success = await deviceService.disableUnattendedAccess(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add to whitelist
  router.post('/:id/whitelist', authenticate, async (req: Request, res: Response) => {
    try {
      const { targetDeviceId } = req.body;
      const success = await deviceService.addToWhitelist(req.params.id, targetDeviceId);
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remove from whitelist
  router.delete('/:id/whitelist/:targetId', authenticate, async (req: Request, res: Response) => {
    try {
      const success = await deviceService.removeFromWhitelist(req.params.id, req.params.targetId);
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add to blacklist
  router.post('/:id/blacklist', authenticate, async (req: Request, res: Response) => {
    try {
      const { targetDeviceId } = req.body;
      const success = await deviceService.addToBlacklist(req.params.id, targetDeviceId);
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
