import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/teams
 * List teams with basic metadata
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: { mentors: true, users: true },
        },
      },
    });

    res.json({
      success: true,
      data: teams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        mentorCount: team._count.mentors,
        userCount: team._count.users,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
