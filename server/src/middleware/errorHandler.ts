import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Central error handler middleware
 * Catches all errors and returns consistent error responses
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate request ID if not exists
  const requestId = req.requestId || uuidv4();

  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = undefined;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  // Log error with request context
  logger.error('Request error', {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code,
    message: err.message,
    stack: err.stack,
    details,
  });

  // Send minimal error response to client
  res.status(statusCode).json({
    error: {
      code,
      message: statusCode < 500 ? message : 'An unexpected error occurred',
      ...(details && { details }),
      requestId,
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  });
}
