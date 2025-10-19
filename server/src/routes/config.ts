import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateWeights } from '../utils/metrics.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Zod schema for config updates
const configSchema = z.object({
  // Targets
  ccTarget: z.number().min(0).max(100).optional(),
  scTarget: z.number().min(0).max(100).optional(),
  upTarget: z.number().min(0).max(100).optional(),
  fixedTarget: z.number().min(0).max(100).optional(),
  referralAchievementTarget: z.number().min(0).max(100).optional(),
  conversionTarget: z.number().min(0).max(100).optional(),

  // Weights (must sum to 100)
  ccWeight: z.number().min(0).max(100).optional(),
  scWeight: z.number().min(0).max(100).optional(),
  upWeight: z.number().min(0).max(100).optional(),
  fixedWeight: z.number().min(0).max(100).optional(),

  // Thresholds
  aboveThreshold: z.number().min(0).max(200).optional(),
  warningThreshold: z.number().min(0).max(200).optional(),

  // Pacing week (1-4)
  pacingWeek: z.number().int().min(1).max(4).optional(),

  // Alert thresholds
  alertThresholds: z
    .object({
      belowTargetPct: z.number().optional(),
      consecutivePeriods: z.number().int().optional(),
      missingDataDays: z.number().int().optional(),
      varianceThreshold: z.number().optional(),
    })
    .optional(),
});

/**
 * GET /api/config
 * Get current configuration (global or team-specific)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const teamId = req.query.teamId as string | undefined;

    // If user is LEADER, restrict to their team
    if (req.user?.role === 'LEADER' && req.user.teamId) {
      const config = await prisma.config.findUnique({
        where: { teamId: req.user.teamId },
      });

      // Fall back to global if no team config
      if (!config) {
        const globalConfig = await prisma.config.findFirst({
          where: { teamId: null },
        });
        return res.json({ success: true, data: globalConfig });
      }

      return res.json({ success: true, data: config });
    }

    // Admin can access any config
    if (teamId) {
      const config = await prisma.config.findUnique({
        where: { teamId },
      });
      return res.json({ success: true, data: config });
    }

    // Default to global config
    const globalConfig = await prisma.config.findFirst({
      where: { teamId: null },
    });

    res.json({ success: true, data: globalConfig });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/config
 * Update configuration (admin only)
 */
router.put('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const body = configSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid configuration data',
          details: body.error.errors,
        },
      });
    }

    const teamId = (req.query.teamId as string | undefined) || null;

    // Get current config
    const currentConfig = teamId
      ? await prisma.config.findUnique({ where: { teamId } })
      : await prisma.config.findFirst({ where: { teamId: null } });

    if (!currentConfig) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Configuration not found',
        },
      });
    }

    // Merge with current values
    const updates = body.data;
    const newWeights = {
      ccWeight: updates.ccWeight ?? currentConfig.ccWeight,
      scWeight: updates.scWeight ?? currentConfig.scWeight,
      upWeight: updates.upWeight ?? currentConfig.upWeight,
      fixedWeight: updates.fixedWeight ?? currentConfig.fixedWeight,
    };

    // Validate weights sum to 100
    try {
      validateWeights({
        ...currentConfig,
        ...newWeights,
        ccTarget: currentConfig.ccTarget,
        scTarget: currentConfig.scTarget,
        upTarget: currentConfig.upTarget,
        fixedTarget: currentConfig.fixedTarget,
        referralAchievementTarget: currentConfig.referralAchievementTarget,
        conversionTarget: currentConfig.conversionTarget,
        aboveThreshold: currentConfig.aboveThreshold,
        warningThreshold: currentConfig.warningThreshold,
      });
    } catch (error: any) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    // Update config
    const updatedConfig = await prisma.config.update({
      where: { id: currentConfig.id },
      data: {
        ...updates,
        alertThresholds: updates.alertThresholds
          ? { ...(currentConfig.alertThresholds as any), ...updates.alertThresholds }
          : undefined,
      },
    });

    res.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/config/pacing
 * Get paced targets for current week
 */
router.get('/pacing', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.config.findFirst({
      where: { teamId: null },
    });

    if (!config) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Config not found' },
      });
    }

    // Calculate paced targets based on current week
    const divisor = config.pacingWeek === 1 ? 4 : config.pacingWeek === 2 ? 3 : config.pacingWeek === 3 ? 2 : 1;

    const pacedTargets = {
      week: config.pacingWeek,
      divisor,
      ccTarget: config.ccTarget / divisor,
      scTarget: config.scTarget / divisor,
      upTarget: config.upTarget / divisor,
      fixedTarget: config.fixedTarget / divisor,
      referralAchievementTarget: config.referralAchievementTarget / divisor,
      conversionTarget: config.conversionTarget / divisor,
    };

    res.json({
      success: true,
      data: pacedTargets,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
