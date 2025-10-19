import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Zod schemas
const querySchema = z.object({
  teamId: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  dismissed: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const dismissSchema = z.object({
  alertIds: z.array(z.string()),
});

const assignSchema = z.object({
  alertId: z.string(),
  userId: z.string(),
});

/**
 * GET /api/alerts
 * List alerts with filtering and pagination
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: query.error.errors },
      });
    }

    const { teamId, severity, dismissed, page, limit } = query.data;

    // Build where clause
    const where: any = {};

    // RBAC: Leaders see only their team's alerts
    if (req.user?.role === 'LEADER' && req.user.teamId) {
      const team = await prisma.team.findUnique({ where: { id: req.user.teamId } });
      if (team) {
        where.teamName = team.name;
      }
    } else if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (team) {
        where.teamName = team.name;
      }
    }

    if (severity) {
      where.severity = severity;
    }

    if (dismissed !== undefined) {
      where.dismissed = dismissed;
    }

    // Fetch alerts
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          rule: { select: { name: true, ruleType: true } },
        },
        orderBy: [{ dismissed: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alerts/dismiss
 * Dismiss multiple alerts
 */
router.post('/dismiss', authenticate, requireRole('ADMIN', 'LEADER'), async (req, res, next) => {
  try {
    const body = dismissSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: body.error.errors },
      });
    }

    // RBAC: Leaders can only dismiss their team's alerts
    if (req.user?.role === 'LEADER' && req.user.teamId) {
      const team = await prisma.team.findUnique({ where: { id: req.user.teamId } });
      if (team) {
        await prisma.alert.updateMany({
          where: {
            id: { in: body.data.alertIds },
            teamName: team.name,
          },
          data: {
            dismissed: true,
            dismissedAt: new Date(),
          },
        });
      }
    } else {
      // Admin can dismiss any alert
      await prisma.alert.updateMany({
        where: { id: { in: body.data.alertIds } },
        data: {
          dismissed: true,
          dismissedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: `Dismissed ${body.data.alertIds.length} alerts`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alerts/assign
 * Assign alert to a user
 */
router.post('/assign', authenticate, requireRole('ADMIN', 'LEADER'), async (req, res, next) => {
  try {
    const body = assignSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: body.error.errors },
      });
    }

    const alert = await prisma.alert.update({
      where: { id: body.data.alertId },
      data: { assignedTo: body.data.userId },
    });

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const where: any = {};

    // RBAC
    if (req.user?.role === 'LEADER' && req.user.teamId) {
      const team = await prisma.team.findUnique({ where: { id: req.user.teamId } });
      if (team) {
        where.teamName = team.name;
      }
    }

    const [total, critical, warnings, dismissed, active] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { ...where, severity: 'WARNING' } }),
      prisma.alert.count({ where: { ...where, dismissed: true } }),
      prisma.alert.count({ where: { ...where, dismissed: false } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        critical,
        warnings,
        dismissed,
        active,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
