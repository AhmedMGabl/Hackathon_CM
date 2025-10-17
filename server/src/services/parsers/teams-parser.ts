import XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';

/**
 * Parse CM Teams Excel file
 * Expected format: Team name in merged cell, then agent rows with referral metrics
 * Columns: Team, CM Name, leads, leads ach%, APP, APP%, Show up, Show up %, Paid, PAIDS ACH
 */
export async function parseTeams(filePath: string) {
  try {
    logger.info('Parsing Teams file', { filePath });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i].includes('Team') && data[i].includes('CM Name')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Teams file');
    }

    const rows = data.slice(headerRowIndex + 1).filter(row => row && row.length > 0);
    logger.info(`Found ${rows.length} data rows in Teams file`);

    const results = {
      processed: 0,
      teamsCreated: 0,
      mentorsUpdated: 0,
      errors: [] as any[],
    };

    let currentTeam = '';
    const periodDate = new Date();
    periodDate.setHours(0, 0, 0, 0);

    for (const row of rows) {
      try {
        // Check if this is a team header row
        if (row[0] && !row[1]) {
          currentTeam = row[0];

          // Ensure team exists
          const existingTeam = await prisma.team.findUnique({ where: { name: currentTeam } });
          if (!existingTeam) {
            await prisma.team.create({ data: { name: currentTeam } });
            results.teamsCreated++;
            logger.info(`Created team: ${currentTeam}`);
          }
          continue;
        }

        // This is a mentor row
        const mentorName = row[1];
        if (!mentorName || !currentTeam) {
          continue;
        }

        const mentorId = mentorName;
        const referralLeads = parseInt(row[2]) || 0;
        const referralShowups = parseInt(row[6]) || 0;
        const referralPaid = parseInt(row[8]) || 0;

        // Find mentor
        const mentor = await prisma.mentor.findUnique({ where: { mentorId } });
        if (!mentor) {
          logger.warn(`Mentor not found in teams file: ${mentorId}`);
          continue;
        }

        // Update MentorStats with referral data
        await prisma.mentorStats.upsert({
          where: {
            mentorId_periodDate: {
              mentorId: mentor.id,
              periodDate,
            },
          },
          update: {
            referralLeads,
            referralShowups,
            referralPaid,
          },
          create: {
            mentorId: mentor.id,
            periodDate,
            referralLeads,
            referralShowups,
            referralPaid,
          },
        });

        results.processed++;
        results.mentorsUpdated++;
      } catch (error: any) {
        results.errors.push({
          row,
          error: error.message,
        });
        logger.error('Error processing team row', { row, error: error.message });
      }
    }

    logger.info('Teams parsing complete', results);
    return results;
  } catch (error: any) {
    logger.error('Error parsing Teams file', { error: error.message });
    throw error;
  }
}
