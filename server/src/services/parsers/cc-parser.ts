import XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';

/**
 * Parse Class Consumption Excel file
 * Expected format from CCtest.xlsx analysis:
 * Row 4: Headers (Team, #, Name, Number_of_students, Avg_class_consumption, ...)
 * Row 5+: Data rows
 */
export async function parseClassConsumption(filePath: string) {
  try {
    logger.info('Parsing Class Consumption file', { filePath });

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    // Find header row (look for "Name" column)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i].includes('Name') && data[i].includes('Number_of_students')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Class Consumption file');
    }

    const headers = data[headerRowIndex];
    const rows = data.slice(headerRowIndex + 1).filter(row =>
      row && row.length > 0 && row[3] // Has a name
    );

    logger.info(`Found ${rows.length} data rows in Class Consumption file`);

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as any[],
    };

    for (const row of rows) {
      try {
        const teamName = row[1] || 'Unknown Team'; // Team column
        const mentorName = row[3]; // Name column
        const mentorId = mentorName; // Use name as ID for now

        if (!mentorName || mentorName === 'Total ME') {
          continue; // Skip totals row
        }

        const totalStudents = parseFloat(row[4]) || 0;
        const avgClassConsumption = parseFloat(row[5]) || 0;
        const superClassPct = (parseFloat(row[6]) || 0) * 100; // Convert to percentage
        const excellentStudentRate = (parseFloat(row[7]) || 0) * 100;

        // Distribution buckets
        const cc0Students = Math.round(totalStudents * (parseFloat(row[13]) || 0));
        const cc1to7Students = Math.round(totalStudents * (parseFloat(row[14]) || 0));
        const cc8to11Students = Math.round(totalStudents * (parseFloat(row[15]) || 0));
        const cc12to14Students = Math.round(totalStudents * (parseFloat(row[16]) || 0));
        const cc15to19Students = Math.round(totalStudents * (parseFloat(row[17]) || 0));
        const cc20PlusStudents = totalStudents - (cc0Students + cc1to7Students + cc8to11Students + cc12to14Students + cc15to19Students);

        // Ensure team exists
        let team = await prisma.team.findUnique({ where: { name: teamName } });
        if (!team) {
          team = await prisma.team.create({ data: { name: teamName } });
          logger.info(`Created team: ${teamName}`);
        }

        // Ensure mentor exists
        let mentor = await prisma.mentor.findUnique({ where: { mentorId } });
        if (!mentor) {
          mentor = await prisma.mentor.create({
            data: {
              mentorId,
              mentorName,
              teamId: team.id,
            },
          });
          results.created++;
          logger.info(`Created mentor: ${mentorName}`);
        } else {
          results.updated++;
        }

        // Upsert MentorStats
        const periodDate = new Date(); // Current date for now
        periodDate.setHours(0, 0, 0, 0);

        await prisma.mentorStats.upsert({
          where: {
            mentorId_periodDate: {
              mentorId: mentor.id,
              periodDate,
            },
          },
          update: {
            totalStudents: Math.round(totalStudents),
            avgClassConsumption,
            superClassPct,
            excellentStudentRate,
            cc0Students,
            cc1to7Students,
            cc8to11Students,
            cc12to14Students,
            cc15to19Students,
            cc20PlusStudents,
          },
          create: {
            mentorId: mentor.id,
            periodDate,
            totalStudents: Math.round(totalStudents),
            avgClassConsumption,
            superClassPct,
            excellentStudentRate,
            cc0Students,
            cc1to7Students,
            cc8to11Students,
            cc12to14Students,
            cc15to19Students,
            cc20PlusStudents,
          },
        });

        results.processed++;
      } catch (error: any) {
        results.errors.push({
          row,
          error: error.message,
        });
        logger.error('Error processing CC row', { row, error: error.message });
      }
    }

    logger.info('Class Consumption parsing complete', results);
    return results;
  } catch (error: any) {
    logger.error('Error parsing Class Consumption file', { error: error.message });
    throw error;
  }
}
