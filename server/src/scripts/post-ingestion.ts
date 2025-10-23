#!/usr/bin/env node
/**
 * Post-Ingestion Script
 * Run this after ingesting data to aggregate stats
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function postIngestion() {
  console.log('📊 Running post-ingestion aggregation...\n');

  // Get latest period date
  const latest = await prisma.metricDaily.findFirst({
    orderBy: { periodDate: 'desc' },
    select: { periodDate: true }
  });

  if (!latest) {
    console.log('No metrics found');
    return;
  }

  const periodDate = latest.periodDate;
  console.log(`Aggregating for: ${periodDate}\n`);

  // Get all metrics for latest date
  const metrics = await prisma.metricDaily.findMany({
    where: { periodDate },
    include: { mentor: true }
  });

  console.log(`Found ${metrics.length} metrics to aggregate\n`);

  let created = 0;
  let updated = 0;

  for (const metric of metrics) {
    try {
      const statData = {
        mentorId: metric.mentorId,
        periodDate: metric.periodDate,
        avgClassConsumption: metric.ccPct || 0,
        superClassPct: metric.scPct || 0,
        excellentStudentRate: 0,
        fixedStudents: 0,
        totalFixable: 0,
        fixedRatePct: metric.fixedPct || 0,
        firstPurchaseCount: 0,
        upgradedCount: 0,
        upgradeRatePct: metric.upPct || 0,
        totalLeads: metric.totalLeads || 0,
        recoveredLeads: metric.recoveredLeads || 0,
        unrecoveredLeads: metric.unrecoveredLeads || 0,
        conversionRatePct: metric.conversionPct || 0,
        referralLeads: metric.referralLeads || 0,
        referralShowups: metric.referralShowups || 0,
        referralPaid: metric.referralPaid || 0,
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
      console.error(`Error processing ${metric.mentor.mentorName}:`, error);
    }
  }

  console.log(`\n✅ Aggregation complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);

  await prisma.$disconnect();
}

function calculateWeightedScore(metric: any): number {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  postIngestion().catch(console.error);
}

export { postIngestion };
