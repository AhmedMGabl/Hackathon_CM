import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';
import type { UserRole } from '../types/index.js';

/**
 * Role-based access control middleware
 * Ensures user has required role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    // Super admins are allowed to access every route
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Team scope validation middleware
 * Ensures leaders can only access their own team's data
 */
export function requireTeamAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  // Admins can access all teams
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Leaders can only access their own team
  const requestedTeamId = req.params.teamId || req.query.teamId || req.body.teamId;

  if (requestedTeamId && requestedTeamId !== req.user.teamId) {
    throw new ForbiddenError('Access denied to this team');
  }

  next();
}
