import XLSX from 'xlsx';
import { prisma } from '../../lib/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Parse Upgrade Rate Excel file
 * Expected format: CM Workplace, Last CM Name, Last CM Team, M-2 First Purchase, M-2 Cumulative Upgrade Students, M-2 Cumulative Upgrade Rate, ...
 */
export async function parseUpgradeRate(filePath: string) {
  try {
    logger.info('Parsing Upgrade Rate file', { filePath });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    const headers = data[0];
    const rows = data.slice(1).filter(row =>
      row && row.length > 0 && row[1] && row[1] !== 'Sub Total' && row[1] !== ''
    );

    logger.info(`Found ${rows.length} data rows in Upgrade Rate file`);

    const results = {
      processed: 0,
      updated: 0,
      errors: [] as any[],
    };

    const periodDate = new Date();
    periodDate.setHours(0, 0, 0, 0);

    for (const row of rows) {
      try {
        const mentorName = row[1]; // Last CM Name
        const mentorId = mentorName;
        const teamName = row[2]; // Last CM Team

        if (!mentorName || mentorName === 'Total') {
          continue;
        }

        const firstPurchaseCount = parseInt(row[3]) || 0;
        const upgradedCount = parseInt(row[4]) || 0;
        const upgradeRatePct = (parseFloat(row[5]) || 0) * 100;

        // Find or create mentor
        let mentor = await prisma.mentor.findUnique({ where: { mentorId } });
        if (!mentor) {
          // Find or create team
          let team = await prisma.team.findUnique({ where: { name: teamName } });
          if (!team) {
            team = await prisma.team.create({ data: { name: teamName } });
          }

          mentor = await prisma.mentor.create({
            data: {
              mentorId,
              mentorName,
              teamId: team.id,
            },
          });
          logger.info(`Created mentor from upgrade data: ${mentorName}`);
        }

        // Upsert MentorStats
        await prisma.mentorStats.upsert({
          where: {
            mentorId_periodDate: {
              mentorId: mentor.id,
              periodDate,
            },
          },
          update: {
            firstPurchaseCount,
            upgradedCount,
            upgradeRatePct,
          },
          create: {
            mentorId: mentor.id,
            periodDate,
            firstPurchaseCount,
            upgradedCount,
            upgradeRatePct,
          },
        });

        results.processed++;
        results.updated++;
      } catch (error: any) {
        results.errors.push({
          row,
          error: error.message,
        });
        logger.error('Error processing upgrade row', { row, error: error.message });
      }
    }

    logger.info('Upgrade Rate parsing complete', results);
    return results;
  } catch (error: any) {
    logger.error('Error parsing Upgrade Rate file', { error: error.message });
    throw error;
  }
}
