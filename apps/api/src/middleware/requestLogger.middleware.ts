import { Request, Response, NextFunction } from 'express';
import { logger } from '@edtech/utils';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode
    });
  });

  next();
}
