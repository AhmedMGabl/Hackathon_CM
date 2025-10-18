import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Zod schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Login with email/password, returns JWT cookie
 */
router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email or password format',
          details: body.error.errors,
        },
      });
    }

    const { email, password } = body.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { team: true },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Generate JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    };

    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as StringValue | number,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, signOptions);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        teamId: user.teamId,
        teamName: user.team?.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { team: true },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        teamId: user.teamId,
        teamName: user.team?.name,
        calendlyUrl: user.calendlyUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/profile
 * Update current user's profile (calendlyUrl)
 */
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
    }

    const { calendlyUrl } = req.body;

    // Validate Calendly URL format if provided
    if (calendlyUrl && calendlyUrl.trim() && !calendlyUrl.includes('calendly.com')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid Calendly URL. Must be a calendly.com link.',
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        calendlyUrl: calendlyUrl?.trim() || null,
      },
      include: { team: true },
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        teamId: updatedUser.teamId,
        teamName: updatedUser.team?.name,
        calendlyUrl: updatedUser.calendlyUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
