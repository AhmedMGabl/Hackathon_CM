#!/usr/bin/env node
/**
 * Aggregate MetricDaily into MentorStats
 * This computes the latest metrics for each mentor from MetricDaily records
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aggregateStats() {
  console.log('📊 Aggregating MetricDaily into MentorStats...\n');

  // Get the latest date from MetricDaily
  const latestMetric = await prisma.metricDaily.findFirst({
    orderBy: { periodDate: 'desc' },
    select: { periodDate: true }
  });

  if (!latestMetric) {
    console.log('No metrics found in MetricDaily');
    return;
  }

  const periodDate = latestMetric.periodDate;
  console.log(`Latest period date: ${periodDate}\n`);

  // Get all metrics for the latest period
  const metrics = await prisma.metricDaily.findMany({
    where: { periodDate },
    include: { mentor: true }
  });

  console.log(`Found ${metrics.length} metric records for ${periodDate}\n`);

  let created = 0;
  let updated = 0;

  // Create/update MentorStats for each metric
  for (const metric of metrics) {
    try {
      const statData = {
        mentorId: metric.mentorId,
        periodDate: metric.periodDate,

        // Metrics from MetricDaily
        avgClassConsumption: metric.ccPct || 0,
        superClassPct: metric.scPct || 0,
        excellentStudentRate: 0, // Not in MetricDaily

        // Fixed rate
        fixedStudents: 0, // Would need student-level data
        totalFixable: 0,
        fixedRatePct: metric.fixedPct || 0,

        // Upgrade
        firstPurchaseCount: 0,
        upgradedCount: 0,
        upgradeRatePct: metric.upPct || 0,

        // Leads
        totalLeads: metric.totalLeads || 0,
        recoveredLeads: metric.recoveredLeads || 0,
        unrecoveredLeads: metric.unrecoveredLeads || 0,
        conversionRatePct: metric.conversionPct || 0,

        // Referral
        referralLeads: metric.referralLeads || 0,
        referralShowups: metric.referralShowups || 0,
        referralPaid: metric.referralPaid || 0,

        // Composite (simplified calculation)
        weightedScore: calculateWeightedScore(metric),
        targetsHit: calculateTargetsHit(metric),
        status: calculateStatus(metric),
        rank: null,
      };

      const existing = await prisma.mentorStats.findFirst({
        where: {
          mentorId: metric.mentorId,
          periodDate: metric.periodDate,
        }
      });

      if (existing) {
        await prisma.mentorStats.update({
          where: { id: existing.id },
          data: statData
        });
        updated++;
      } else {
        await prisma.mentorStats.create({
          data: statData
        });
        created++;
      }
    } catch (error) {
      console.error(`Error processing mentor ${metric.mentor.mentorName}:`, error);
    }
  }

  console.log(`\n✅ Aggregation complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);

  await prisma.$disconnect();
}

function calculateWeightedScore(metric: any): number {
  // Simple weighted score: average of all metrics
  const metrics = [
    metric.ccPct || 0,
    metric.scPct || 0,
    metric.upPct || 0,
    metric.fixedPct || 0
  ];

  const validMetrics = metrics.filter(m => m > 0);
  if (validMetrics.length === 0) return 0;

  return validMetrics.reduce((sum, m) => sum + m, 0) / validMetrics.length;
}

function calculateTargetsHit(metric: any): number {
  // Count how many metrics hit targets (simplified: >75% = hit)
  let count = 0;
  if ((metric.ccPct || 0) >= 75) count++;
  if ((metric.scPct || 0) >= 12) count++;
  if ((metric.upPct || 0) >= 20) count++;
  if ((metric.fixedPct || 0) >= 50) count++;
  return count;
}

function calculateStatus(metric: any): 'ABOVE' | 'WARNING' | 'BELOW' {
  const score = calculateWeightedScore(metric);
  if (score >= 80) return 'ABOVE';
  if (score >= 60) return 'WARNING';
  return 'BELOW';
}

aggregateStats().catch(console.error);
