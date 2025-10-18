import { Router } from 'express';
import { z } from 'zod';
import type { MentorStats as MentorStatsModel, Student as StudentModel, Mentor as MentorModel } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { DEFAULT_TARGETS } from '../config/constants.js';

const router = Router();

// Zod schemas
const querySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['ABOVE', 'WARNING', 'BELOW']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const underperformerQuerySchema = z.object({
  teamId: z.string().optional(),
  scoreThreshold: z.coerce.number().min(0).max(200).default(95),
  maxTargetsHit: z.coerce.number().int().min(0).max(4).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

function buildSummaryFromStat(stat?: MentorStatsModel | null) {
  if (!stat) {
    return {
      studentCounts: { total: 0, active: 0 },
      classConsumptionBuckets: [
        { label: '0', value: 0 },
        { label: '1-7', value: 0 },
        { label: '8-11', value: 0 },
        { label: '12-14', value: 0 },
        { label: '15-19', value: 0 },
        { label: '20+', value: 0 },
      ],
      engagement: {
        avgClassConsumption: 0,
        superClassPct: 0,
        excellentStudentRate: 0,
      },
      fixedRate: {
        fixedStudents: 0,
        totalFixable: 0,
        fixedRatePct: 0,
      },
      upgrade: {
        firstPurchaseCount: 0,
        upgradedCount: 0,
        upgradeRatePct: 0,
      },
      leads: {
        totalLeads: 0,
        recoveredLeads: 0,
        unrecoveredLeads: 0,
        conversionRatePct: 0,
      },
      referral: {
        referralLeads: 0,
        referralShowups: 0,
        referralPaid: 0,
      },
      composite: {
        weightedScore: 0,
        targetsHit: 0,
        status: 'BELOW' as const,
      },
    };
  }

  return {
    studentCounts: {
      total: stat.totalStudents,
      active: stat.activeStudents,
    },
    classConsumptionBuckets: [
      { label: '0', value: stat.cc0Students },
      { label: '1-7', value: stat.cc1to7Students },
      { label: '8-11', value: stat.cc8to11Students },
      { label: '12-14', value: stat.cc12to14Students },
      { label: '15-19', value: stat.cc15to19Students },
      { label: '20+', value: stat.cc20PlusStudents },
    ],
    engagement: {
      avgClassConsumption: stat.avgClassConsumption,
      superClassPct: stat.superClassPct,
      excellentStudentRate: stat.excellentStudentRate,
    },
    fixedRate: {
      fixedStudents: stat.fixedStudents,
      totalFixable: stat.totalFixable,
      fixedRatePct: stat.fixedRatePct,
    },
    upgrade: {
      firstPurchaseCount: stat.firstPurchaseCount,
      upgradedCount: stat.upgradedCount,
      upgradeRatePct: stat.upgradeRatePct,
    },
    leads: {
      totalLeads: stat.totalLeads,
      recoveredLeads: stat.recoveredLeads,
      unrecoveredLeads: stat.unrecoveredLeads,
      conversionRatePct: stat.conversionRatePct,
    },
    referral: {
      referralLeads: stat.referralLeads,
      referralShowups: stat.referralShowups,
      referralPaid: stat.referralPaid,
    },
    composite: {
      weightedScore: stat.weightedScore,
      targetsHit: stat.targetsHit,
      status: stat.status,
    },
  };
}

function buildTimeSeries(stats: MentorStatsModel[]) {
  return stats
    .map((entry) => ({
      periodDate: entry.periodDate,
      weightedScore: entry.weightedScore,
      avgClassConsumption: entry.avgClassConsumption,
      superClassPct: entry.superClassPct,
      upgradeRatePct: entry.upgradeRatePct,
      fixedRatePct: entry.fixedRatePct,
      conversionRatePct: entry.conversionRatePct,
      targetsHit: entry.targetsHit,
      status: entry.status,
    }))
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
}

function buildStudentInsight(students: StudentModel[]) {
  const total = students.length;
  const fixedCount = students.filter((s) => s.isFixed).length;
  const recoveredCount = students.filter((s) => s.isRecovered).length;

  const withEngagement = students.map((student) => ({
    ...student,
    classConsumptionThisMonth: student.classConsumptionThisMonth ?? 0,
  }));

  const topPerformers = [...withEngagement]
    .sort((a, b) => b.classConsumptionThisMonth - a.classConsumptionThisMonth)
    .slice(0, 10);

  const needsAttention = [...withEngagement]
    .sort((a, b) => a.classConsumptionThisMonth - b.classConsumptionThisMonth)
    .slice(0, 10);

  return {
    totals: {
      total,
      fixedCount,
      recoveredCount,
    },
    topPerformers,
    needsAttention,
    sample: withEngagement.slice(0, 100),
  };
}

function buildMentorListItem(
  mentor: MentorModel & { team: { name: string } },
  summary: ReturnType<typeof buildSummaryFromStat>,
  stat?: MentorStatsModel | null
) {
  return {
    id: mentor.id,
    mentorId: mentor.mentorId,
    mentorName: mentor.mentorName,
    teamName: mentor.team.name,
    teamId: mentor.teamId,
    avgCcPct: summary.engagement.avgClassConsumption,
    avgScPct: summary.engagement.superClassPct,
    avgUpPct: summary.upgrade.upgradeRatePct,
    avgFixedPct: summary.fixedRate.fixedRatePct,
    weightedScore: summary.composite.weightedScore,
    status: summary.composite.status,
    targetsHit: summary.composite.targetsHit,
    rank: stat?.rank ?? null,
    totalStudents: summary.studentCounts.total,
    totalLeads: summary.leads.totalLeads,
    recoveredLeads: summary.leads.recoveredLeads,
    unrecoveredLeads: summary.leads.unrecoveredLeads,
    conversionRatePct: summary.leads.conversionRatePct,
    referralLeads: summary.referral.referralLeads,
    referralShowups: summary.referral.referralShowups,
    referralPaid: summary.referral.referralPaid,
  };
}

function buildUnderperformanceReasons(
  summary: ReturnType<typeof buildSummaryFromStat>,
  scoreThreshold: number,
  targets = DEFAULT_TARGETS
) {
  const reasons: string[] = [];

  if (summary.composite.weightedScore < scoreThreshold) {
    reasons.push(`Weighted score ${summary.composite.weightedScore.toFixed(1)} below ${scoreThreshold}`);
  }
  if (summary.engagement.avgClassConsumption < targets.ccTarget) {
    reasons.push(`Class consumption ${summary.engagement.avgClassConsumption.toFixed(1)}% below ${targets.ccTarget}% target`);
  }
  if (summary.engagement.superClassPct < targets.scTarget) {
    reasons.push(`Super class ${summary.engagement.superClassPct.toFixed(1)}% below ${targets.scTarget}% target`);
  }
  if (summary.upgrade.upgradeRatePct < targets.upTarget) {
    reasons.push(`Upgrade rate ${summary.upgrade.upgradeRatePct.toFixed(1)}% below ${targets.upTarget}% target`);
  }
  if (summary.fixedRate.fixedRatePct < targets.fixedTarget) {
    reasons.push(`Fixed rate ${summary.fixedRate.fixedRatePct.toFixed(1)}% below ${targets.fixedTarget}% target`);
  }
  if (summary.leads.conversionRatePct < targets.conversionTarget) {
    reasons.push(
      `Lead conversion ${summary.leads.conversionRatePct.toFixed(1)}% below ${targets.conversionTarget}% target`
    );
  }

  return reasons;
}

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
    const mentorIds = mentors.map((m) => m.id);
    const stats = await prisma.mentorStats.findMany({
      where: {
        mentorId: { in: mentorIds },
        periodDate,
      },
    });

    const statsMap = new Map<string, MentorStatsModel>(stats.map((s) => [s.mentorId, s]));

    // Combine mentor info with stats
    let mentorsWithStats = mentors.map((mentor) => {
      const stat = statsMap.get(mentor.id);
      const summary = buildSummaryFromStat(stat);
      return buildMentorListItem(mentor, summary, stat);
    });

    // Filter by status if requested
    if (status) {
      mentorsWithStats = mentorsWithStats.filter((m) => m.status === status);
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
 * GET /api/mentors/underperformers
 * Surface mentors needing attention for meeting preparation
 */
router.get('/underperformers', authenticate, async (req, res, next) => {
  try {
    const parsed = underperformerQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.errors,
        },
      });
    }

    const { scoreThreshold, maxTargetsHit, limit, teamId } = parsed.data;

    const latestStats = await prisma.mentorStats.findFirst({
      orderBy: { periodDate: 'desc' },
      select: { periodDate: true },
    });

    if (!latestStats) {
      return res.json({
        success: true,
        data: {
          periodDate: null,
          mentors: [],
          params: { scoreThreshold, maxTargetsHit, limit, teamId: teamId ?? null },
        },
      });
    }

    const whereClause: any = {
      periodDate: latestStats.periodDate,
      weightedScore: { lt: scoreThreshold },
    };

    if (maxTargetsHit < 4) {
      whereClause.targetsHit = { lte: maxTargetsHit };
    }

    if (teamId) {
      whereClause.mentor = { teamId };
    } else if (req.user?.role === 'LEADER' && req.user.teamId) {
      whereClause.mentor = { teamId: req.user.teamId };
    }

    const stats = await prisma.mentorStats.findMany({
      where: whereClause,
      include: {
        mentor: {
          include: { team: true },
        },
      },
      orderBy: [{ weightedScore: 'asc' }],
      take: limit,
    });

    const mentors = stats.map((stat) => {
      const summary = buildSummaryFromStat(stat);
      const overview = buildMentorListItem(stat.mentor, summary, stat);
      const reasons = buildUnderperformanceReasons(summary, scoreThreshold, DEFAULT_TARGETS);

      if (overview.targetsHit > maxTargetsHit) {
        reasons.push(`Only ${overview.targetsHit} target(s) hit`);
      }

      return {
        ...overview,
        summary,
        periodDate: stat.periodDate.toISOString(),
        reasons,
      };
    });

    res.json({
      success: true,
      data: {
        periodDate: latestStats.periodDate.toISOString(),
        params: { scoreThreshold, maxTargetsHit, limit, teamId: teamId ?? null },
        mentors,
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

    const latestStat = await prisma.mentorStats.findFirst({
      where: { mentorId: mentor.id },
      orderBy: { periodDate: 'desc' },
    });

    const historicalStats = await prisma.mentorStats.findMany({
      where: { mentorId: mentor.id },
      orderBy: { periodDate: 'desc' },
      take: 12,
    });

    const studentRecords = await prisma.student.findMany({
      where: { mentorId: mentor.mentorId },
      orderBy: { classConsumptionThisMonth: 'desc' },
      take: 200,
    });

    const summary = buildSummaryFromStat(latestStat);
    const timeSeries = buildTimeSeries(historicalStats);
    const studentInsights = buildStudentInsight(studentRecords);

    res.json({
      success: true,
      data: {
        mentor: {
          id: mentor.id,
          mentorId: mentor.mentorId,
          mentorName: mentor.mentorName,
          teamId: mentor.teamId,
          teamName: mentor.team.name,
        },
        summary,
        timeSeries,
        studentInsights,
        latestStat,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
