import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10) / 1000,
});

export class RateLimiter {
  static middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        await rateLimiter.consume(key);
        next();
      } catch {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Please wait before making more requests',
        });
      }
    };
  }

  static strictMiddleware(points: number = 5, duration: number = 60) {
    const strictLimiter = new RateLimiterMemory({ points, duration });

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        await strictLimiter.consume(key);
        next();
      } catch {
        res.status(429).json({
          error: 'Too many requests',
          message: 'This action is rate limited. Please try again later.',
        });
      }
    };
  }
}
