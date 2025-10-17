import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate unique request ID
  req.requestId = uuidv4();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture start time
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
