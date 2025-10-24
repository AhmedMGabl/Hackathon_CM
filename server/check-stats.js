import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStats() {
  const mentorStatsCount = await prisma.mentorStats.count();
  const metricDailyCount = await prisma.metricDaily.count();
  const mentorCount = await prisma.mentor.count();

  console.log('Database Status:');
  console.log('  Mentors:', mentorCount);
  console.log('  MetricDaily records:', metricDailyCount);
  console.log('  MentorStats records:', mentorStatsCount);

  if (mentorStatsCount === 0 && metricDailyCount > 0) {
    console.log('\n⚠️  MentorStats is empty but MetricDaily has data.');
    console.log('   Running aggregation...\n');

    // Import and run the aggregation
    const { postIngestion } = await import('./src/scripts/post-ingestion.ts');
    await postIngestion();
  }

  await prisma.$disconnect();
}

checkStats().catch(console.error);
