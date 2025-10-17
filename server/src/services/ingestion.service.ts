import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import crypto from 'crypto';
import {
  calculateWeightedScore,
  calculateStatus,
  countTargetsHit,
  type TargetConfig,
} from '../utils/metrics.js';

const prisma = new PrismaClient();

// Column mapping presets (flexible header matching)
const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
  mentorId: ['mentor_id', 'mentorid', 'id', 'employee_id', 'cm_id'],
  mentorName: ['mentor_name', 'name', 'mentor', 'employee', 'full_name'],
  periodDate: ['date', 'period', 'period_date', 'day', 'date_recorded'],
  ccPct: ['cc', 'cc_pct', 'cc%', 'class_consumption', 'consumption_%', 'consumption_pct'],
  scPct: ['sc', 'sc_pct', 'sc%', 'super_cc', 'scc_%', 'super_consumption'],
  upPct: ['up', 'up_pct', 'up%', 'upgrade', 'upgrade_%', 'upgrade_pct'],
  fixedPct: ['fixed', 'fixed_pct', 'fixed%', 'fixed_%'],
  referralLeads: ['leads', 'referral_leads', 'total_referrals', 'referrals'],
  referralShowups: ['showups', 'referral_showups', 'appointments', 'shows'],
  referralPaid: ['paid', 'referral_paid', 'conversions', 'converted'],
  totalLeads: ['total', 'all_leads', 'total_leads'],
  recoveredLeads: ['recovered', 'recovered_leads', 'recovered_count'],
  unrecoveredLeads: ['unrecovered', 'unrecovered_leads', 'unrecovered_count'],
};

export interface ColumnMapping {
  [key: string]: string; // e.g., { mentorId: 'employee_id', ccPct: 'cc%' }
}

export interface IngestionReport {
  processed: number;
  accepted: number;
  rejected: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}

/**
 * Safe percent coercion: handles 0.8, 80, or "80%" → 80
 */
function parsePercent(value: any): number | null {
  if (value == null || value === '') return null;
  const str = String(value).trim().replace('%', '').replace(',', '.');
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  // If < 1, assume decimal (0.8 → 80)
  return num < 1 && num > 0 ? num * 100 : num;
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Generate checksum for deduplication
 */
function generateChecksum(mentorId: string, periodDate: Date): string {
  return crypto
    .createHash('md5')
    .update(`${mentorId}:${periodDate.toISOString().split('T')[0]}`)
    .digest('hex');
}

/**
 * Auto-map headers based on similarity
 */
function autoMapHeaders(headers: string[], customMapping?: ColumnMapping): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const [targetField, variants] of Object.entries(DEFAULT_COLUMN_MAPPINGS)) {
    // Check custom mapping first
    if (customMapping && customMapping[targetField]) {
      mapping[targetField] = customMapping[targetField];
      continue;
    }

    // Find matching header
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
    for (const variant of variants) {
      const idx = normalizedHeaders.indexOf(variant.toLowerCase());
      if (idx >= 0) {
        mapping[targetField] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Extract value from row using mapping
 */
function extractValue(row: any, mapping: Record<string, string>, field: string): any {
  const header = mapping[field];
  return header ? row[header] : undefined;
}

/**
 * Ingest from uploaded file (Excel/CSV)
 */
export async function ingestFromUpload(
  file: Express.Multer.File,
  source: string,
  userId?: string,
  customMapping?: ColumnMapping
): Promise<IngestionReport> {
  const workbook = XLSX.readFile(file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // Auto-detect headers
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const mapping = autoMapHeaders(headers, customMapping);

  const report: IngestionReport = {
    processed: rows.length,
    accepted: 0,
    rejected: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Get current config for calculations
  const config = await prisma.config.findFirst({ where: { teamId: null } });
  if (!config) {
    throw new Error('Global config not found. Run seed first.');
  }

  const targetConfig: TargetConfig = {
    ccTarget: config.ccTarget,
    scTarget: config.scTarget,
    upTarget: config.upTarget,
    fixedTarget: config.fixedTarget,
    referralAchievementTarget: config.referralAchievementTarget,
    conversionTarget: config.conversionTarget,
    aboveThreshold: config.aboveThreshold,
    warningThreshold: config.warningThreshold,
    ccWeight: config.ccWeight,
    scWeight: config.scWeight,
    upWeight: config.upWeight,
    fixedWeight: config.fixedWeight,
  };

  for (const [idx, row] of rows.entries()) {
    try {
      const mentorIdValue = extractValue(row, mapping, 'mentorId');
      const periodDateValue = extractValue(row, mapping, 'periodDate');

      if (!mentorIdValue || !periodDateValue) {
        report.rejected++;
        report.errors.push({
          row: idx + 1,
          reason: 'Missing required fields: mentorId or periodDate',
          data: row,
        });
        continue;
      }

      const periodDate = parseDate(periodDateValue);
      if (!periodDate) {
        report.rejected++;
        report.errors.push({
          row: idx + 1,
          reason: `Invalid date format: ${periodDateValue}`,
          data: row,
        });
        continue;
      }

      // Find or create mentor
      let mentor = await prisma.mentor.findUnique({
        where: { mentorId: String(mentorIdValue) },
        include: { team: true },
      });

      if (!mentor) {
        const mentorName =
          extractValue(row, mapping, 'mentorName') || `Mentor ${mentorIdValue}`;
        // Assign to first team by default (improve this logic as needed)
        const defaultTeam = await prisma.team.findFirst();
        if (!defaultTeam) {
          throw new Error('No teams found in database');
        }

        mentor = await prisma.mentor.create({
          data: {
            mentorId: String(mentorIdValue),
            mentorName,
            teamId: defaultTeam.id,
          },
          include: { team: true },
        });
      }

      const checksum = generateChecksum(String(mentorIdValue), periodDate);
      const weekOfMonth = Math.ceil(periodDate.getDate() / 7);

      // Parse metrics with safe coercion
      const ccPct = parsePercent(extractValue(row, mapping, 'ccPct'));
      const scPct = parsePercent(extractValue(row, mapping, 'scPct'));
      const upPct = parsePercent(extractValue(row, mapping, 'upPct'));
      const fixedPct = parsePercent(extractValue(row, mapping, 'fixedPct'));

      const referralLeads = parseInt(extractValue(row, mapping, 'referralLeads')) || null;
      const referralShowups = parseInt(extractValue(row, mapping, 'referralShowups')) || null;
      const referralPaid = parseInt(extractValue(row, mapping, 'referralPaid')) || null;

      const totalLeads = parseInt(extractValue(row, mapping, 'totalLeads')) || null;
      const recoveredLeads = parseInt(extractValue(row, mapping, 'recoveredLeads')) || null;
      const unrecoveredLeads =
        parseInt(extractValue(row, mapping, 'unrecoveredLeads')) ||
        (totalLeads && recoveredLeads ? totalLeads - recoveredLeads : null);

      const data = {
        mentorId: mentor.id,
        teamId: mentor.teamId,
        periodDate,
        weekOfMonth,
        ccPct,
        scPct,
        upPct,
        fixedPct,
        referralLeads,
        referralShowups,
        referralPaid,
        totalLeads,
        recoveredLeads,
        unrecoveredLeads,
        notes: unrecoveredLeads && unrecoveredLeads > 40 ? ['High unrecovered volume'] : [],
        checksum,
      };

      // Check for existing record
      const existing = await prisma.metricDaily.findUnique({
        where: {
          mentorId_periodDate: {
            mentorId: mentor.id,
            periodDate,
          },
        },
      });

      if (existing?.checksum === checksum) {
        report.rejected++;
        report.errors.push({
          row: idx + 1,
          reason: 'Duplicate record (same checksum)',
        });
        continue;
      }

      if (existing) {
        await prisma.metricDaily.update({
          where: { id: existing.id },
          data,
        });
        report.updated++;
      } else {
        await prisma.metricDaily.create({ data });
        report.created++;
      }

      report.accepted++;
    } catch (error: any) {
      report.rejected++;
      report.errors.push({
        row: idx + 1,
        reason: error.message,
        data: row,
      });
    }
  }

  // Log ingestion
  await prisma.upload.create({
    data: {
      source,
      sourceDetail: file.originalname,
      checksum: crypto.createHash('md5').update(file.filename).digest('hex'),
      createdBy: userId,
      meta: { mapping, headers },
      status: report.rejected === 0 ? 'SUCCESS' : report.accepted > 0 ? 'PARTIAL' : 'FAILED',
      recordsProcessed: report.processed,
      recordsAccepted: report.accepted,
      recordsRejected: report.rejected,
      recordsUpdated: report.updated,
      recordsCreated: report.created,
      errors: report.errors.length > 0 ? report.errors : null,
    },
  });

  return report;
}

/**
 * Ingest from Google Sheets
 */
export async function ingestFromGoogleSheets(
  spreadsheetId: string,
  range: string,
  source: string,
  userId?: string,
  customMapping?: ColumnMapping
): Promise<IngestionReport> {
  // TODO: Implement Google Sheets API integration
  // For now, return placeholder
  const report: IngestionReport = {
    processed: 0,
    accepted: 0,
    rejected: 0,
    created: 0,
    updated: 0,
    errors: [{ row: 0, reason: 'Google Sheets ingestion not yet implemented' }],
  };

  await prisma.upload.create({
    data: {
      source,
      sourceDetail: `${spreadsheetId}!${range}`,
      createdBy: userId,
      meta: { spreadsheetId, range, mapping: customMapping },
      status: 'FAILED',
      recordsProcessed: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: report.errors,
    },
  });

  return report;
}

/**
 * Get ingestion history
 */
export async function getIngestionHistory(limit = 20) {
  return await prisma.upload.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      source: true,
      sourceDetail: true,
      status: true,
      recordsProcessed: true,
      recordsAccepted: true,
      recordsRejected: true,
      recordsCreated: true,
      recordsUpdated: true,
      createdAt: true,
    },
  });
}
