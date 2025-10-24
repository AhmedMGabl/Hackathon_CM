import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verifying dashboard data...\n');

  // Check MentorStats
  const statsCount = await prisma.mentorStats.count();
  console.log(`📊 MentorStats records: ${statsCount}`);

  if (statsCount > 0) {
    const latestStats = await prisma.mentorStats.findMany({
      take: 5,
      orderBy: { periodDate: 'desc' },
      include: { mentor: true }
    });

    console.log('\n📈 Sample stats:');
    latestStats.forEach(stat => {
      console.log(`  ${stat.mentor.mentorName} (${stat.periodDate.toISOString().split('T')[0]}):`);
      console.log(`    CC: ${stat.avgClassConsumption}%, SC: ${stat.superClassPct}%`);
      console.log(`    Fixed: ${stat.fixedRatePct}%, Upgrade: ${stat.upgradeRatePct}%`);
      console.log(`    Status: ${stat.status}, Score: ${stat.weightedScore}`);
    });
  }

  // Check Mentors
  const mentorCount = await prisma.mentor.count();
  console.log(`\n👥 Total Mentors: ${mentorCount}`);

  if (mentorCount > 0) {
    const sampleMentors = await prisma.mentor.findMany({
      take: 5,
      include: { team: true }
    });

    console.log('\n👤 Sample mentors:');
    sampleMentors.forEach(m => {
      console.log(`  ${m.mentorName} (${m.team?.teamName || 'No team'})`);
    });
  }

  // Check MetricDaily
  const metricsCount = await prisma.metricDaily.count();
  console.log(`\n📅 MetricDaily records: ${metricsCount}`);

  console.log('\n✅ Verification complete!');
  await prisma.$disconnect();
}

verifyData().catch(console.error);
