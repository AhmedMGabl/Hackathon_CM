import { Router } from 'express';
import { z } from 'zod';
import type { MentorStats as MentorStatsModel } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Zod schemas
const querySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['ABOVE', 'WARNING', 'BELOW']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

/**
 * GET /api/mentors
 * List mentors with their latest stats
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: query.error.errors },
      });
    }

    const { teamId, status, search, page, limit } = query.data;

    // Build where clause for mentors
    const mentorWhere: any = {};

    // RBAC: Leaders see only their team
    if (req.user?.role === 'LEADER' || req.user?.role === 'ADMIN') {
      if (req.user.teamId) {
        mentorWhere.teamId = req.user.teamId;
      }
    } else if (teamId) {
      mentorWhere.teamId = teamId;
    }

    if (search) {
      mentorWhere.OR = [
        { mentorName: { contains: search, mode: 'insensitive' } },
        { mentorId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get latest period date
    const latestStats = await prisma.mentorStats.findFirst({
      orderBy: { periodDate: 'desc' },
      select: { periodDate: true },
    });

    if (!latestStats) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const periodDate = latestStats.periodDate;

    // Fetch mentors with their latest stats
    const mentors = await prisma.mentor.findMany({
      where: mentorWhere,
      include: {
        team: { select: { name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get stats for these mentors
    const mentorIds = mentors.map(m => m.id);
    const stats = await prisma.mentorStats.findMany({
      where: {
        mentorId: { in: mentorIds },
        periodDate,
      },
    });

    const statsMap = new Map<string, MentorStatsModel>(stats.map((s) => [s.mentorId, s]));

    // Combine mentor info with stats
    let mentorsWithStats = mentors.map(mentor => {
      const stat = statsMap.get(mentor.id);

      return {
        id: mentor.id,
        mentorId: mentor.mentorId,
        mentorName: mentor.mentorName,
        teamName: mentor.team.name,
        teamId: mentor.teamId,
        avgCcPct: stat?.avgClassConsumption || 0,
        avgScPct: stat?.superClassPct || 0,
        avgUpPct: stat?.upgradeRatePct || 0,
        avgFixedPct: stat?.fixedRatePct || 0,
        weightedScore: stat?.weightedScore || 0,
        status: stat?.status || 'BELOW',
        targetsHit: stat?.targetsHit || 0,
        rank: stat?.rank || null,
        totalStudents: stat?.totalStudents || 0,
        totalLeads: stat?.totalLeads || 0,
        recoveredLeads: stat?.recoveredLeads || 0,
        unrecoveredLeads: stat?.unrecoveredLeads || 0,
        conversionRatePct: stat?.conversionRatePct || 0,
        referralLeads: stat?.referralLeads || 0,
        referralShowups: stat?.referralShowups || 0,
        referralPaid: stat?.referralPaid || 0,
      };
    });

    // Filter by status if requested
    if (status) {
      mentorsWithStats = mentorsWithStats.filter(m => m.status === status);
    }

    // Sort by weighted score desc
    mentorsWithStats.sort((a, b) => b.weightedScore - a.weightedScore);

    // Get total count
    const total = await prisma.mentor.count({ where: mentorWhere });

    res.json({
      success: true,
      data: mentorsWithStats,
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
 * Get single mentor with detailed stats and student data
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const mentor = await prisma.mentor.findUnique({
      where: { id: req.params.id },
      include: {
        team: true,
      },
    });

    if (!mentor) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Mentor not found' },
      });
    }

    // RBAC check
    if ((req.user?.role === 'LEADER' || req.user?.role === 'ADMIN') && req.user.teamId !== mentor.teamId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    // Get latest stats
    const latestStat = await prisma.mentorStats.findFirst({
      where: { mentorId: mentor.id },
      orderBy: { periodDate: 'desc' },
    });

    // Get historical stats (last 8 weeks)
    const historicalStats = await prisma.mentorStats.findMany({
      where: { mentorId: mentor.id },
      orderBy: { periodDate: 'desc' },
      take: 8,
    });

    // Get student list (sample)
    const students = await prisma.student.findMany({
      where: { mentorId: mentor.mentorId },
      take: 100,
      orderBy: { classConsumptionThisMonth: 'desc' },
    });

    res.json({
      success: true,
      data: {
        mentor,
        latestStats: latestStat,
        historicalStats,
        students,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
