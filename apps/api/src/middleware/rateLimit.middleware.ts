import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitStore>();

/**
 * Basic In-Memory Rate Limiting Middleware
 * Prevents basic DOS / abuse attempts.
 */
export function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return ApiResponse.error(
        res,
        'Too many requests. Please try again later.',
        429,
        'ERR_TOO_MANY_REQUESTS'
      );
    }

    record.count += 1;
    return next();
  };
}
