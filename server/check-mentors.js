import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMentors() {
  console.log('=== Database Check ===\n');

  // Check Mentor count
  const mentorCount = await prisma.mentor.count();
  console.log('Mentors:', mentorCount);

  // Check MetricDaily count
  const metricDailyCount = await prisma.metricDaily.count();
  console.log('MetricDaily records:', metricDailyCount);

  // Check MentorStats count
  const mentorStatsCount = await prisma.mentorStats.count();
  console.log('MentorStats records:', mentorStatsCount);

  // Group MentorStats by period
  console.log('\nMentorStats by period:');
  const stats = await prisma.mentorStats.groupBy({
    by: ['periodDate'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  stats.forEach(s => {
    console.log('  ', s.periodDate.toISOString().split('T')[0], ':', s._count.id, 'records');
  });

  // Check a sample mentor with stats
  const sampleMentor = await prisma.mentor.findFirst({
    include: {
      team: true,
      stats: {
        take: 1,
        orderBy: { periodDate: 'desc' }
      }
    }
  });

  if (sampleMentor) {
    console.log('\nSample Mentor:');
    console.log('  Name:', sampleMentor.mentorName);
    console.log('  Team:', sampleMentor.team.name);
    console.log('  Has Stats:', sampleMentor.stats.length > 0 ? 'Yes' : 'No');
    if (sampleMentor.stats.length > 0) {
      console.log('  Latest Period:', sampleMentor.stats[0].periodDate.toISOString().split('T')[0]);
      console.log('  Weighted Score:', sampleMentor.stats[0].weightedScore);
      console.log('  Status:', sampleMentor.stats[0].status);
    }
  }

  await prisma.$disconnect();
}

checkMentors().catch(console.error);
