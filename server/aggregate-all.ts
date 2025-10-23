#!/usr/bin/env node
/**
 * Aggregate ALL MetricDaily records into MentorStats
 * This ensures all historical data is available
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aggregateAllStats() {
  console.log('📊 Aggregating ALL MetricDaily records into MentorStats...\n');

  // Get all unique period dates
  const dates = await prisma.metricDaily.findMany({
    select: { periodDate: true },
    distinct: ['periodDate'],
    orderBy: { periodDate: 'desc' }
  });

  console.log(`Found ${dates.length} unique dates to process\n`);

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const { periodDate } of dates) {
    console.log(`Processing ${periodDate}...`);

    const metrics = await prisma.metricDaily.findMany({
      where: { periodDate },
      include: { mentor: true }
    });

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
        console.error(`  Error processing mentor ${metric.mentor.mentorName}:`, error);
      }
    }

    console.log(`  Created: ${created}, Updated: ${updated}`);
    totalCreated += created;
    totalUpdated += updated;
  }

  console.log(`\n✅ Aggregation complete!`);
  console.log(`   Total Created: ${totalCreated}`);
  console.log(`   Total Updated: ${totalUpdated}`);

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

aggregateAllStats().catch(console.error);
