import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { JWTPayload } from '../types/index.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT authentication middleware
 * Validates JWT token from cookie and attaches user to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie (changed from auth_token to token)
    const token = req.cookies?.token;

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Authentication token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't fail if missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: ('ADMIN' | 'LEADER')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
}
