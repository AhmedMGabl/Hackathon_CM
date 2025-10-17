import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import {
  calculateWeightedScore,
  calculateStatus,
  countTargetsHit,
  type TargetConfig,
} from '../utils/metrics.js';

const router = Router();
const prisma = new PrismaClient();

// Zod schemas
const querySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['ABOVE', 'WARNING', 'BELOW']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['mentorName', 'weightedScore', 'targetsHit']).default('mentorName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * GET /api/mentors
 * List mentors with pagination, filtering, and computed metrics
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: query.error.errors },
      });
    }

    const { teamId, status, search, page, limit, sortBy, sortOrder } = query.data;

    // Build where clause
    const where: any = {};

    // RBAC: Leaders see only their team
    if (req.user?.role === 'LEADER' && req.user.teamId) {
      where.teamId = req.user.teamId;
    } else if (teamId) {
      where.teamId = teamId;
    }

    if (search) {
      where.OR = [
        { mentorName: { contains: search, mode: 'insensitive' } },
        { mentorId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get config for calculations
    const config = await prisma.config.findFirst({ where: { teamId: null } });
    if (!config) {
      return res.status(500).json({ error: { code: 'CONFIG_NOT_FOUND' } });
    }

    const targetConfig: TargetConfig = {
      ccTarget: config.ccTarget,
      scTarget: config.scTarget,
      upTarget: config.upTarget,
      fixedTarget: config.fixedTarget,
      referralAchievementTarget: config.referralAchievementTarget,
      conversionTarget: config.conversionTarget,
      aboveThreshold: config.aboveThreshold,
      warningThreshold: config.warningThreshold,
      ccWeight: config.ccWeight,
      scWeight: config.scWeight,
      upWeight: config.upWeight,
      fixedWeight: config.fixedWeight,
    };

    // Fetch mentors with latest metrics
    const mentors = await prisma.mentor.findMany({
      where,
      include: {
        team: { select: { name: true } },
        metrics: {
          orderBy: { periodDate: 'desc' },
          take: 30, // Last 30 days for aggregation
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Compute aggregated metrics for each mentor
    const mentorsWithMetrics = mentors.map((mentor) => {
      const recentMetrics = mentor.metrics.slice(0, 30);

      if (recentMetrics.length === 0) {
        return {
          id: mentor.id,
          mentorId: mentor.mentorId,
          mentorName: mentor.mentorName,
          teamName: mentor.team.name,
          teamId: mentor.teamId,
          avgCcPct: null,
          avgScPct: null,
          avgUpPct: null,
          avgFixedPct: null,
          weightedScore: 0,
          status: 'BELOW' as const,
          targetsHit: 0,
          rank: null,
        };
      }

      // Calculate averages
      const avgCcPct =
        recentMetrics.reduce((sum, m) => sum + (m.ccPct || 0), 0) / recentMetrics.length;
      const avgScPct =
        recentMetrics.reduce((sum, m) => sum + (m.scPct || 0), 0) / recentMetrics.length;
      const avgUpPct =
        recentMetrics.reduce((sum, m) => sum + (m.upPct || 0), 0) / recentMetrics.length;
      const avgFixedPct =
        recentMetrics.reduce((sum, m) => sum + (m.fixedPct || 0), 0) / recentMetrics.length;

      const weightedScore = calculateWeightedScore(
        { ccPct: avgCcPct, scPct: avgScPct, upPct: avgUpPct, fixedPct: avgFixedPct },
        targetConfig
      );

      const calculatedStatus = calculateStatus(weightedScore, targetConfig);
      const targetsHit = countTargetsHit(
        { ccPct: avgCcPct, scPct: avgScPct, upPct: avgUpPct, fixedPct: avgFixedPct },
        targetConfig
      );

      return {
        id: mentor.id,
        mentorId: mentor.mentorId,
        mentorName: mentor.mentorName,
        teamName: mentor.team.name,
        teamId: mentor.teamId,
        avgCcPct: Math.round(avgCcPct * 10) / 10,
        avgScPct: Math.round(avgScPct * 10) / 10,
        avgUpPct: Math.round(avgUpPct * 10) / 10,
        avgFixedPct: Math.round(avgFixedPct * 10) / 10,
        weightedScore: Math.round(weightedScore * 10) / 10,
        status: calculatedStatus,
        targetsHit,
        rank: null, // Computed below
      };
    });

    // Filter by status if requested
    let filtered = status
      ? mentorsWithMetrics.filter((m) => m.status === status)
      : mentorsWithMetrics;

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });

    // Calculate ranks
    const sortedByScore = [...filtered].sort((a, b) => b.weightedScore - a.weightedScore);
    const rankedData = filtered.map((m) => ({
      ...m,
      rank: sortedByScore.findIndex((s) => s.id === m.id) + 1,
    }));

    // Get total count for pagination
    const total = await prisma.mentor.count({ where });

    res.json({
      success: true,
      data: rankedData,
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
 * GET /api/mentors/:id
 * Get single mentor with detailed metrics
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const mentor = await prisma.mentor.findUnique({
      where: { id: req.params.id },
      include: {
        team: true,
        metrics: {
          orderBy: { periodDate: 'desc' },
          take: 60, // Last 60 days
        },
      },
    });

    if (!mentor) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Mentor not found' },
      });
    }

    // RBAC check
    if (req.user?.role === 'LEADER' && req.user.teamId !== mentor.teamId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    res.json({
      success: true,
      data: mentor,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
