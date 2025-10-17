import XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';

/**
 * Parse Leads Excel file (1410Leads.xlsx - 57k+ rows)
 * Expected headers: Student ID, LP employee group name, LP employee assigned, Total number of cards,
 * Class consumption, Registration Date, Fixed/Unfixed, Packages, etc.
 */
export async function parseLeads(filePath: string) {
  try {
    logger.info('Parsing Leads file', { filePath });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    const headers = data[0];
    const rows = data.slice(1).filter(row => row && row.length > 0 && row[0]);

    logger.info(`Found ${rows.length} data rows in Leads file`);

    const results = {
      processed: 0,
      studentsProcessed: 0,
      errors: [] as any[],
    };

    // Group by mentor to calculate lead stats
    const mentorLeadStats: Record<string, {
      totalLeads: number;
      recovered: number;
      unrecovered: number;
      teamName: string;
    }> = {};

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        try {
          const studentId = String(row[0]); // Student ID
          const teamName = row[3] || 'Unknown Team'; // LP employee group name
          const mentorName = row[4]; // LP employee assigned
          const mentorId = mentorName;

          if (!studentId || !mentorName) {
            continue;
          }

          const totalCards = parseInt(row[6]) || 0;
          const classConsumptionLastMonth = parseFloat(row[7]) || 0;
          const classConsumptionThisMonth = parseFloat(row[8]) || 0;
          const studentLevel = String(row[15] || '');
          const fixedStatus = String(row[16] || 'Unfixed');
          const isFixed = fixedStatus.toLowerCase() !== 'unfixed' && fixedStatus.toLowerCase() !== 'missing';
          const packages = String(row[18] || '');

          // Parse dates (Excel dates are numbers)
          const registrationDate = row[10] ? excelDateToJSDate(row[10]) : null;
          const firstOrderDate = row[5] ? excelDateToJSDate(row[5]) : null;
          const latestRenewalTime = row[9] ? excelDateToJSDate(row[9]) : null;

          // Determine if recovered (has renewal or recent activity)
          const isRecovered = latestRenewalTime !== null && totalCards > 0;

          // Track mentor lead stats
          if (!mentorLeadStats[mentorId]) {
            mentorLeadStats[mentorId] = {
              totalLeads: 0,
              recovered: 0,
              unrecovered: 0,
              teamName,
            };
          }
          mentorLeadStats[mentorId].totalLeads++;
          if (isRecovered) {
            mentorLeadStats[mentorId].recovered++;
          } else {
            mentorLeadStats[mentorId].unrecovered++;
          }

          // Upsert student
          await prisma.student.upsert({
            where: { studentId },
            update: {
              classConsumptionLastMonth,
              classConsumptionThisMonth,
              isRecovered,
              studentLevel,
              isFixed,
              packages,
              registrationDate,
              firstOrderDate,
              latestRenewalTime,
            },
            create: {
              studentId,
              mentorId,
              teamName,
              classConsumptionLastMonth,
              classConsumptionThisMonth,
              isRecovered,
              studentLevel,
              isFixed,
              packages,
              registrationDate,
              firstOrderDate,
              latestRenewalTime,
            },
          });

          results.processed++;
          results.studentsProcessed++;
        } catch (error: any) {
          results.errors.push({
            row,
            error: error.message,
          });
        }
      }

      logger.info(`Processed ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} leads`);
    }

    // Update MentorStats with lead conversion data
    const periodDate = new Date();
    periodDate.setHours(0, 0, 0, 0);

    for (const [mentorId, stats] of Object.entries(mentorLeadStats)) {
      try {
        const mentor = await prisma.mentor.findUnique({ where: { mentorId } });
        if (!mentor) {
          logger.warn(`Mentor not found for leads: ${mentorId}`);
          continue;
        }

        const conversionRatePct = stats.totalLeads > 0
          ? (stats.recovered / stats.totalLeads) * 100
          : 0;

        await prisma.mentorStats.upsert({
          where: {
            mentorId_periodDate: {
              mentorId: mentor.id,
              periodDate,
            },
          },
          update: {
            totalLeads: stats.totalLeads,
            recoveredLeads: stats.recovered,
            unrecoveredLeads: stats.unrecovered,
            conversionRatePct,
          },
          create: {
            mentorId: mentor.id,
            periodDate,
            totalLeads: stats.totalLeads,
            recoveredLeads: stats.recovered,
            unrecoveredLeads: stats.unrecovered,
            conversionRatePct,
          },
        });
      } catch (error: any) {
        logger.error('Error updating mentor lead stats', { mentorId, error: error.message });
      }
    }

    logger.info('Leads parsing complete', results);
    return results;
  } catch (error: any) {
    logger.error('Error parsing Leads file', { error: error.message });
    throw error;
  }
}

// Helper function to convert Excel date number to JS Date
function excelDateToJSDate(excelDate: any): Date | null {
  if (!excelDate || isNaN(excelDate)) return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}
