/**
 * Persistence Service - Database operations for ingestion
 * Handles upserts, deduplication, and audit logging
 */

import { PrismaClient } from '@prisma/client';
import type { MergedMetric } from './merger.js';
import { normalizeName } from './cleaners.js';

const prisma = new PrismaClient();

export interface PersistenceResult {
  created: number;
  updated: number;
  skippedDuplicate: number;
  errors: Array<{ mentor: string; reason: string }>;
}

/**
 * Persist merged metrics to database
 * - Creates/updates Mentor records
 * - Creates/updates Team records
 * - Upserts MetricDaily records with deduplication
 */
export async function persistMetrics(
  metrics: MergedMetric[],
  ingestionId?: string
): Promise<PersistenceResult> {
  const result: PersistenceResult = {
    created: 0,
    updated: 0,
    skippedDuplicate: 0,
    errors: []
  };

  // Group metrics by team for batch processing
  const teamSet = new Set<string>();
  metrics.forEach(m => {
    if (m.teamName) teamSet.add(m.teamName);
  });

  // Ensure all teams exist
  const teamMap = new Map<string, string>(); // name -> id
  for (const teamName of teamSet) {
    try {
      const team = await prisma.team.upsert({
        where: { name: teamName },
        create: { name: teamName },
        update: {}
      });
      teamMap.set(teamName, team.id);
    } catch (error) {
      console.error(`Failed to upsert team ${teamName}:`, error);
    }
  }

  // Default team for mentors without team assignment
  let defaultTeam = await prisma.team.findFirst({ where: { name: 'Unassigned' } });
  if (!defaultTeam) {
    defaultTeam = await prisma.team.create({ data: { name: 'Unassigned' } });
  }

  // Group metrics by mentor
  const mentorMetrics = new Map<string, MergedMetric[]>();
  metrics.forEach(metric => {
    if (!mentorMetrics.has(metric.mentorName)) {
      mentorMetrics.set(metric.mentorName, []);
    }
    mentorMetrics.get(metric.mentorName)!.push(metric);
  });

  // Process each mentor
  for (const [mentorName, mentorData] of mentorMetrics) {
    try {
      // Get team ID for this mentor
      const firstMetric = mentorData[0];
      const teamId = firstMetric.teamName
        ? (teamMap.get(firstMetric.teamName) || defaultTeam.id)
        : defaultTeam.id;

      // Upsert Mentor record
      const mentor = await prisma.mentor.upsert({
        where: { mentorId: mentorName }, // Using normalized name as external ID
        create: {
          mentorId: mentorName,
          mentorName: mentorName,
          teamId: teamId
        },
        update: {
          teamId: teamId, // Update team if changed
          mentorName: mentorName
        }
      });

      // Upsert each metric record
      for (const metric of mentorData) {
        try {
          // Check for existing record by checksum
          const existing = await prisma.metricDaily.findFirst({
            where: {
              mentorId: mentor.id,
              periodDate: metric.periodDate
            }
          });

          if (existing && existing.checksum === metric.checksum) {
            // Exact duplicate - skip
            result.skippedDuplicate++;
            continue;
          }

          // Upsert metric
          await prisma.metricDaily.upsert({
            where: {
              mentorId_periodDate: {
                mentorId: mentor.id,
                periodDate: metric.periodDate
              }
            },
            create: {
              mentorId: mentor.id,
              teamId: teamId,
              periodDate: metric.periodDate,
              weekOfMonth: metric.weekOfMonth,
              ccPct: metric.ccPct,
              scPct: metric.scPct,
              upPct: metric.upPct,
              fixedPct: metric.fixedPct,
              referralLeads: metric.referralLeads,
              referralShowups: metric.referralShowups,
              referralPaid: metric.referralPaid,
              referralAchievementPct: metric.referralAchievementPct,
              totalLeads: metric.totalLeads,
              recoveredLeads: metric.recoveredLeads,
              unrecoveredLeads: metric.unrecoveredLeads,
              conversionPct: metric.conversionPct,
              notes: metric.notes || [],
              checksum: metric.checksum,
              ingestionId: ingestionId
            },
            update: {
              weekOfMonth: metric.weekOfMonth,
              ccPct: metric.ccPct !== undefined ? metric.ccPct : undefined,
              scPct: metric.scPct !== undefined ? metric.scPct : undefined,
              upPct: metric.upPct !== undefined ? metric.upPct : undefined,
              fixedPct: metric.fixedPct !== undefined ? metric.fixedPct : undefined,
              referralLeads: metric.referralLeads !== undefined ? metric.referralLeads : undefined,
              referralShowups: metric.referralShowups !== undefined ? metric.referralShowups : undefined,
              referralPaid: metric.referralPaid !== undefined ? metric.referralPaid : undefined,
              referralAchievementPct: metric.referralAchievementPct !== undefined ? metric.referralAchievementPct : undefined,
              totalLeads: metric.totalLeads !== undefined ? metric.totalLeads : undefined,
              recoveredLeads: metric.recoveredLeads !== undefined ? metric.recoveredLeads : undefined,
              unrecoveredLeads: metric.unrecoveredLeads !== undefined ? metric.unrecoveredLeads : undefined,
              conversionPct: metric.conversionPct !== undefined ? metric.conversionPct : undefined,
              notes: metric.notes !== undefined ? metric.notes : undefined,
              checksum: metric.checksum,
              ingestionId: ingestionId,
              updatedAt: new Date()
            }
          });

          if (existing) {
            result.updated++;
          } else {
            result.created++;
          }
        } catch (error) {
          result.errors.push({
            mentor: mentorName,
            reason: `Failed to persist metric for ${metric.periodDate.toISOString()}: ${error instanceof Error ? error.message : 'Unknown'}`
          });
        }
      }
    } catch (error) {
      result.errors.push({
        mentor: mentorName,
        reason: `Failed to process mentor: ${error instanceof Error ? error.message : 'Unknown'}`
      });
    }
  }

  return result;
}

/**
 * Create upload audit record
 */
export async function createUploadRecord(data: {
  source: string;
  sourceDetail?: string;
  checksum?: string;
  createdBy?: string;
  meta?: any;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsProcessed: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsUpdated: number;
  recordsCreated: number;
  errors?: any[];
}): Promise<string> {
  const upload = await prisma.upload.create({
    data: {
      source: data.source,
      sourceDetail: data.sourceDetail,
      checksum: data.checksum,
      createdBy: data.createdBy,
      meta: data.meta || {},
      status: data.status,
      recordsProcessed: data.recordsProcessed,
      recordsAccepted: data.recordsAccepted,
      recordsRejected: data.recordsRejected,
      recordsUpdated: data.recordsUpdated,
      recordsCreated: data.recordsCreated,
      errors: data.errors || []
    }
  });

  return upload.id;
}

/**
 * Get recent upload records
 */
export async function getRecentUploads(limit: number = 10) {
  return prisma.upload.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get upload record by ID
 */
export async function getUploadById(id: string) {
  return prisma.upload.findUnique({
    where: { id }
  });
}

/**
 * Clean up database connection
 */
export async function disconnect() {
  await prisma.$disconnect();
}
