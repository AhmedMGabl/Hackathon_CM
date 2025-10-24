import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aggregateAll() {
  console.log('📊 Running FULL aggregation for ALL dates...\n');

  // Get all unique period dates
  const periods = await prisma.metricDaily.groupBy({
    by: ['periodDate'],
    _count: { id: true },
    orderBy: { periodDate: 'desc' }
  });

  console.log(`Found ${periods.length} unique period dates:\n`);
  periods.forEach(p => {
    console.log(`  ${p.periodDate.toISOString().split('T')[0]} - ${p._count.id} metrics`);
  });

  let totalCreated = 0;
  let totalUpdated = 0;

  // Process each period
  for (const period of periods) {
    const periodDate = period.periodDate;
    console.log(`\n🔄 Processing ${periodDate.toISOString().split('T')[0]}...`);

    const metrics = await prisma.metricDaily.findMany({
      where: { periodDate },
      include: { mentor: true }
    });

    console.log(`  Found ${metrics.length} metrics`);

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
          totalStudents: 0,
          activeStudents: 0,
          cc0Students: 0,
          cc1to7Students: 0,
          cc8to11Students: 0,
          cc12to14Students: 0,
          cc15to19Students: 0,
          cc20PlusStudents: 0,
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
          totalUpdated++;
        } else {
          await prisma.mentorStats.create({
            data: statData
          });
          totalCreated++;
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${metric.mentor.mentorName}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Full aggregation complete!`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Total: ${totalCreated + totalUpdated}`);

  await prisma.$disconnect();
}

function calculateWeightedScore(metric) {
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

function calculateTargetsHit(metric) {
  let count = 0;
  if ((metric.ccPct || 0) >= 75) count++;
  if ((metric.scPct || 0) >= 12) count++;
  if ((metric.upPct || 0) >= 20) count++;
  if ((metric.fixedPct || 0) >= 50) count++;
  return count;
}

function calculateStatus(metric) {
  const score = calculateWeightedScore(metric);
  if (score >= 80) return 'ABOVE';
  if (score >= 60) return 'WARNING';
  return 'BELOW';
}

aggregateAll().catch(console.error);
