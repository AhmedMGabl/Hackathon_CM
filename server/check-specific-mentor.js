import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificMentor() {
  // Find a mentor with actual CC data
  const metricWithData = await prisma.metricDaily.findFirst({
    where: { ccPct: { gt: 0 } },
    include: { mentor: true }
  });

  if (!metricWithData) {
    console.log('❌ No metrics with CC data found');
    return;
  }

  console.log(`\n📊 Checking mentor: ${metricWithData.mentor.mentorName}\n`);
  console.log('MetricDaily data:');
  console.log(`  CC: ${metricWithData.ccPct}%`);
  console.log(`  SC: ${metricWithData.scPct}%`);
  console.log(`  Fixed: ${metricWithData.fixedPct}%`);
  console.log(`  UP: ${metricWithData.upPct}%`);
  console.log(`  Period: ${metricWithData.periodDate.toISOString().split('T')[0]}`);

  // Find corresponding MentorStats
  const mentorStats = await prisma.mentorStats.findFirst({
    where: {
      mentorId: metricWithData.mentorId,
      periodDate: metricWithData.periodDate
    }
  });

  if (mentorStats) {
    console.log('\nMentorStats data:');
    console.log(`  avgClassConsumption: ${mentorStats.avgClassConsumption}%`);
    console.log(`  superClassPct: ${mentorStats.superClassPct}%`);
    console.log(`  fixedRatePct: ${mentorStats.fixedRatePct}%`);
    console.log(`  upgradeRatePct: ${mentorStats.upgradeRatePct}%`);
    console.log(`  Status: ${mentorStats.status}`);
    console.log(`  Weighted Score: ${mentorStats.weightedScore}`);
  } else {
    console.log('\n❌ No MentorStats found for this mentor/period');
  }

  await prisma.$disconnect();
}

checkSpecificMentor().catch(console.error);
