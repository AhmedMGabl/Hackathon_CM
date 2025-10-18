import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import aiService from '../services/ai.service.js';
import logger from '../utils/logger.js';

const router = Router();

// Zod schemas for request validation
const coachRequestSchema = z.object({
  agentId: z.string().optional(),
  teamId: z.string().optional(),
  question: z.string().optional(),
  metrics: z.object({
    ccPct: z.number().optional(),
    scPct: z.number().optional(),
    upPct: z.number().optional(),
    fixedPct: z.number().optional(),
    conversionPct: z.number().optional(),
  }).optional(),
  targets: z.object({
    ccTarget: z.number().optional(),
    scTarget: z.number().optional(),
    upTarget: z.number().optional(),
    fixedTarget: z.number().optional(),
  }).optional(),
});

const helpRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
});

/**
 * POST /api/ai/coach
 * Get AI-powered performance coaching insights
 */
router.post('/coach', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = coachRequestSchema.parse(req.body);

    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'AI coaching is not currently available. Please contact your administrator.',
        },
      });
    }

    logger.info('AI coach request', {
      userId: req.user?.id,
      agentId: validatedData.agentId,
      hasMetrics: !!validatedData.metrics,
    });

    const response = await aiService.coach(validatedData);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
    }

    logger.error('AI coach endpoint error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate coaching insights',
      },
    });
  }
});

/**
 * POST /api/ai/help
 * Get AI-powered help and Q&A
 */
router.post('/help', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = helpRequestSchema.parse(req.body);

    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'AI help is not currently available. Please contact your administrator.',
        },
      });
    }

    logger.info('AI help request', {
      userId: req.user?.id,
      questionLength: validatedData.question.length,
    });

    const response = await aiService.help(validatedData);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
    }

    logger.error('AI help endpoint error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate help response',
      },
    });
  }
});

/**
 * GET /api/ai/status
 * Check if AI features are enabled
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: aiService.isEnabled(),
      features: {
        coach: aiService.isEnabled(),
        help: aiService.isEnabled(),
      },
    },
  });
});

export default router;
