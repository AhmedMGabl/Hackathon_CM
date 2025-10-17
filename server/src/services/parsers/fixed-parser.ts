import XLSX from 'xlsx';
import { prisma } from '../../lib/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Parse Fixed Rate Excel file
 * Expected format from FTtest.xlsx:
 * Headers: Year-Month, Student id, LP Group, LP, First Order Date, Packages, Fixed or Not, Number of fixed plans, Number of fixed Teachers, Completed Lessons This Month
 */
export async function parseFixedRate(filePath: string) {
  try {
    logger.info('Parsing Fixed Rate file', { filePath });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    const headers = data[0];
    const rows = data.slice(1).filter(row => row && row.length > 0);

    logger.info(`Found ${rows.length} data rows in Fixed Rate file`);

    const results = {
      processed: 0,
      studentsCreated: 0,
      studentsUpdated: 0,
      errors: [] as any[],
    };

    // Group by mentor to calculate aggregates
    const mentorStats: Record<string, { fixed: number; total: number; teamName: string }> = {};

    for (const row of rows) {
      try {
        const studentId = String(row[1]); // Student id
        const teamName = row[2] || 'Unknown Team'; // LP Group
        const mentorName = row[3]; // LP (mentor name)
        const mentorId = mentorName;

        if (!studentId || !mentorName) {
          continue;
        }

        const isFixed = row[6] === 1 || row[6] === '1' || row[6] === true;
        const fixedPlansCount = parseInt(row[7]) || 0;
        const fixedTeachersCount = parseInt(row[8]) || 0;
        const completedLessonsThisMonth = parseInt(row[9]) || 0;

        // Track mentor stats
        if (!mentorStats[mentorId]) {
          mentorStats[mentorId] = { fixed: 0, total: 0, teamName };
        }
        mentorStats[mentorId].total++;
        if (isFixed) {
          mentorStats[mentorId].fixed++;
        }

        // Upsert student
        await prisma.student.upsert({
          where: { studentId },
          update: {
            isFixed,
            fixedPlansCount,
            fixedTeachersCount,
            completedLessonsThisMonth,
          },
          create: {
            studentId,
            mentorId, // Will need to resolve to actual mentor ID
            teamName,
            isFixed,
            fixedPlansCount,
            fixedTeachersCount,
            completedLessonsThisMonth,
          },
        });

        results.processed++;
        if (results.processed % 1000 === 0) {
          logger.info(`Processed ${results.processed} fixed rate records`);
        }
      } catch (error: any) {
        results.errors.push({
          row,
          error: error.message,
        });
      }
    }

    // Update MentorStats with aggregated fixed rate data
    const periodDate = new Date();
    periodDate.setHours(0, 0, 0, 0);

    for (const [mentorId, stats] of Object.entries(mentorStats)) {
      try {
        // Find mentor
        const mentor = await prisma.mentor.findUnique({ where: { mentorId } });
        if (!mentor) {
          logger.warn(`Mentor not found for fixed rate: ${mentorId}`);
          continue;
        }

        const fixedRatePct = stats.total > 0 ? (stats.fixed / stats.total) * 100 : 0;

        await prisma.mentorStats.upsert({
          where: {
            mentorId_periodDate: {
              mentorId: mentor.id,
              periodDate,
            },
          },
          update: {
            fixedStudents: stats.fixed,
            totalFixable: stats.total,
            fixedRatePct,
          },
          create: {
            mentorId: mentor.id,
            periodDate,
            fixedStudents: stats.fixed,
            totalFixable: stats.total,
            fixedRatePct,
          },
        });
      } catch (error: any) {
        logger.error('Error updating mentor fixed rate stats', { mentorId, error: error.message });
      }
    }

    logger.info('Fixed Rate parsing complete', results);
    return results;
  } catch (error: any) {
    logger.error('Error parsing Fixed Rate file', { error: error.message });
    throw error;
  }
}
