import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSourceData() {
  console.log('🔍 Checking source MetricDaily data...\n');

  // Get metrics with actual data
  const metrics = await prisma.metricDaily.findMany({
    take: 10,
    orderBy: { periodDate: 'desc' },
    include: { mentor: true },
    where: {
      OR: [
        { ccPct: { gt: 0 } },
        { scPct: { gt: 0 } },
        { fixedPct: { gt: 0 } },
        { upPct: { gt: 0 } }
      ]
    }
  });

  console.log(`Found ${metrics.length} metrics with non-zero values:\n`);

  metrics.forEach(m => {
    console.log(`${m.mentor.mentorName} (${m.periodDate.toISOString().split('T')[0]}):`);
    console.log(`  CC: ${m.ccPct}%, SC: ${m.scPct}%`);
    console.log(`  Fixed: ${m.fixedPct}%, UP: ${m.upPct}%`);
    console.log(`  Referral: leads=${m.referralLeads}, showups=${m.referralShowups}, paid=${m.referralPaid}`);
    console.log(`  Total Leads: ${m.totalLeads}, Recovered: ${m.recoveredLeads}, Conversion: ${m.conversionPct}%`);
    console.log();
  });

  // Count metrics with data
  const withCC = await prisma.metricDaily.count({ where: { ccPct: { gt: 0 } } });
  const withSC = await prisma.metricDaily.count({ where: { scPct: { gt: 0 } } });
  const withFixed = await prisma.metricDaily.count({ where: { fixedPct: { gt: 0 } } });
  const withUP = await prisma.metricDaily.count({ where: { upPct: { gt: 0 } } });

  console.log('📊 Data coverage:');
  console.log(`  Metrics with CC data: ${withCC}`);
  console.log(`  Metrics with SC data: ${withSC}`);
  console.log(`  Metrics with Fixed data: ${withFixed}`);
  console.log(`  Metrics with Upgrade data: ${withUP}`);

  await prisma.$disconnect();
}

checkSourceData().catch(console.error);
