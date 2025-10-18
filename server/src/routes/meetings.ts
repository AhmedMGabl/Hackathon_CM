import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import meetingPrepService from '../services/meeting-prep.service.js';
import emailService from '../services/email.service.js';
import logger from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();
const defaultMeetingInclude = {
  attendees: {
    include: {
      mentor: {
        select: {
          id: true,
          mentorId: true,
          mentorName: true,
          teamId: true,
        },
      },
    },
  },
} satisfies Prisma.MeetingInclude;

// Zod schemas
const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  scoreThreshold: z.number().min(0).max(100).optional(),
  mentorIds: z.array(z.string()).min(1, 'At least one mentor is required'),
  scheduledDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

const updateAttendeeSchema = z.object({
  attended: z.boolean().optional(),
  manualNotes: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
});

/**
 * GET /api/meetings
 * List all meetings (with optional filters)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: defaultMeetingInclude,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.meeting.count({ where });

    res.json({
      success: true,
      data: {
        meetings,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    logger.error('Failed to list meetings', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load meetings',
      },
    });
  }
});

/**
 * GET /api/meetings/:id
 * Get meeting details
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: {
          include: {
            mentor: {
              select: {
                id: true,
                mentorId: true,
                mentorName: true,
                teamId: true,
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Meeting not found',
        },
      });
    }

    res.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    logger.error('Failed to get meeting', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load meeting',
      },
    });
  }
});

/**
 * POST /api/meetings
 * Create a new meeting with AI-generated prep notes
 */
router.post('/', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const validatedData = createMeetingSchema.parse(req.body);

    // Fetch mentor data for prep generation
    const mentors = await prisma.mentor.findMany({
      where: {
        id: { in: validatedData.mentorIds },
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        stats: {
          orderBy: { periodDate: 'desc' },
          take: 1,
        },
      },
    });

    if (mentors.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'No valid mentors found',
        },
      });
    }

    // Get target config
    const config = await prisma.config.findFirst();
    const targets = {
      ccTarget: config?.ccTarget || 80,
      scTarget: config?.scTarget || 15,
      upTarget: config?.upTarget || 25,
      fixedTarget: config?.fixedTarget || 60,
    };

    // Prepare data for AI
    const mentorPrepData = mentors.map(m => {
      const latestStat = m.stats[0];
      const metrics = {
        ccPct: latestStat?.avgClassConsumption,
        scPct: latestStat?.superClassPct,
        upPct: latestStat?.upgradeRatePct,
        fixedPct: latestStat?.fixedRatePct,
        conversionPct: latestStat?.conversionRatePct,
        weightedScore: latestStat?.weightedScore,
      };

      const missedTargets = [];
      if (metrics.ccPct !== undefined && metrics.ccPct < targets.ccTarget) missedTargets.push('CC%');
      if (metrics.scPct !== undefined && metrics.scPct < targets.scTarget) missedTargets.push('SC%');
      if (metrics.upPct !== undefined && metrics.upPct < targets.upTarget) missedTargets.push('UP%');
      if (metrics.fixedPct !== undefined && metrics.fixedPct < targets.fixedTarget) missedTargets.push('Fixed%');

      return {
        mentorId: m.mentorId,
        mentorName: m.mentorName,
        teamName: m.team.name,
        metrics,
        targets,
        missedTargets,
        targetsHit: latestStat?.targetsHit || 0,
      };
    });

    // Generate AI prep notes
    logger.info('Generating meeting prep notes', { mentorCount: mentors.length });
    const prepResults = await meetingPrepService.generateMeetingPrep(mentorPrepData);

    // Create meeting with attendees
    const meeting = await prisma.meeting.create({
      data: {
        title: validatedData.title,
        scoreThreshold: validatedData.scoreThreshold,
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null,
        notes: validatedData.notes,
        createdBy: req.user?.id,
        status: validatedData.scheduledDate ? 'SCHEDULED' : 'PENDING',
        aiInsights: prepResults as unknown as Prisma.InputJsonValue, // Store all prep results
        attendees: {
          create: mentors.map(m => {
            const prep = prepResults.find(p => p.mentorId === m.mentorId);
            const attendeeData: Prisma.MeetingAttendeeCreateWithoutMeetingInput = {
              mentor: { connect: { id: m.id } },
            };
            if (prep) {
              attendeeData.aiPrepNotes = prep as unknown as Prisma.InputJsonValue;
            }
            return attendeeData;
          }),
        },
      },
      include: defaultMeetingInclude,
    });

    logger.info('Meeting created', { meetingId: meeting.id, attendeeCount: meeting.attendees.length });

    res.json({
      success: true,
      data: meeting,
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

    logger.error('Failed to create meeting', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create meeting',
      },
    });
  }
});

/**
 * PATCH /api/meetings/:id
 * Update meeting details
 */
router.patch('/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateMeetingSchema.parse(req.body);

    const updateData: any = {};
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.scheduledDate) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
      if (updateData.status === 'PENDING') {
        updateData.status = 'SCHEDULED';
      }
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: defaultMeetingInclude,
    });

    res.json({
      success: true,
      data: meeting,
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

    logger.error('Failed to update meeting', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update meeting',
      },
    });
  }
});

/**
 * PATCH /api/meetings/:meetingId/attendees/:attendeeId
 * Update attendee notes/attendance
 */
router.patch('/:meetingId/attendees/:attendeeId', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { attendeeId } = req.params;
    const validatedData = updateAttendeeSchema.parse(req.body);

    const updateData: any = {};
    if (validatedData.attended !== undefined) updateData.attended = validatedData.attended;
    if (validatedData.manualNotes !== undefined) updateData.manualNotes = validatedData.manualNotes;
    if (validatedData.actionItems !== undefined) updateData.actionItems = validatedData.actionItems;

    const attendee = await prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: updateData,
      include: {
        mentor: {
          select: {
            id: true,
            mentorId: true,
            mentorName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: attendee,
    });
  } catch (error) {
    logger.error('Failed to update attendee', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update attendee',
      },
    });
  }
});

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete('/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.meeting.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete meeting', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete meeting',
      },
    });
  }
});

/**
 * POST /api/meetings/:id/send-invites
 * Send email invites to all meeting attendees
 */
router.post('/:id/send-invites', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get meeting with attendees
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: {
          include: {
            mentor: {
              select: {
                id: true,
                mentorId: true,
                mentorName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Meeting not found',
        },
      });
    }

    // Get team leader info
    const teamLeader = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        calendlyUrl: true,
      },
    });

    if (!teamLeader) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Team leader not found',
        },
      });
    }

    if (!teamLeader.calendlyUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CALENDLY_NOT_SET',
          message: 'Please add your Calendly URL to your profile before sending invites',
        },
      });
    }

    if (!emailService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_CONFIGURED',
          message: 'Email service is not configured. Please contact your administrator',
        },
      });
    }

    // Send emails to attendees
    const results = [];
    for (const attendee of meeting.attendees) {
      if (!attendee.mentor.email) {
        logger.warn('Mentor has no email, skipping', { mentorId: attendee.mentor.mentorId });
        results.push({
          mentorId: attendee.mentor.mentorId,
          mentorName: attendee.mentor.mentorName,
          success: false,
          error: 'No email address',
        });
        continue;
      }

      const prepNotes = attendee.aiPrepNotes as any;
      const emailSent = await emailService.sendMeetingInvitation({
        mentorName: attendee.mentor.mentorName,
        mentorEmail: attendee.mentor.email,
        teamLeaderName: `${teamLeader.firstName} ${teamLeader.lastName}`,
        teamLeaderEmail: teamLeader.email,
        calendlyUrl: teamLeader.calendlyUrl,
        meetingTitle: meeting.title,
        missedTargets: prepNotes?.missedTargets || [],
        summary: prepNotes?.summary || 'Performance review meeting',
        talkingPoints: prepNotes?.talkingPoints || [],
      });

      if (emailSent) {
        // Update attendee record
        await prisma.meetingAttendee.update({
          where: { id: attendee.id },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      }

      results.push({
        mentorId: attendee.mentor.mentorId,
        mentorName: attendee.mentor.mentorName,
        success: emailSent,
      });
    }

    // Update meeting record
    await prisma.meeting.update({
      where: { id },
      data: {
        emailsSent: true,
        emailsSentAt: new Date(),
      },
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: successCount,
        failed: failCount,
        results,
      },
    });
  } catch (error) {
    logger.error('Failed to send meeting invites', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send meeting invites',
      },
    });
  }
});

export default router;
