/**
 * Source-Specific ETL Transformers
 * Transform raw Excel data into standardized format for each source type
 */

import * as XLSX from 'xlsx';
import {
  cleanPercentValue,
  cleanIntValue,
  cleanNumericValue,
  normalizeName,
  normalizeTeamName,
  parseDate,
  parseNotes,
  getWeekOfMonth,
  generateChecksum
} from './cleaners.js';
import {
  autoMapHeaders,
  getMappedValue,
  detectSourceType,
  type ColumnMapping,
  type SourceType
} from './header-mapping.js';

export interface TransformedRow {
  mentorId?: string;
  mentorName: string;
  teamName?: string;
  periodDate: Date;
  weekOfMonth: number;

  // Core metrics
  ccPct?: number;
  scPct?: number;
  upPct?: number;
  fixedPct?: number;

  // Referral funnel
  referralLeads?: number;
  referralShowups?: number;
  referralPaid?: number;
  referralAchievementPct?: number;

  // Lead recovery
  totalLeads?: number;
  recoveredLeads?: number;
  unrecoveredLeads?: number;
  conversionPct?: number;
  notes?: string[];

  // Metadata
  checksum: string;
  sourceType: SourceType;
}

export interface TransformResult {
  source: SourceType;
  file: string;
  received: number;
  accepted: TransformedRow[];
  rejected: Array<{ row: number; reason: string; data?: any }>;
  columnsDetected: string[];
  columnsMapped: ColumnMapping;
}

/**
 * Transform CC (Class Consumption) file
 */
export function transformCCFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'CC',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  // Auto-map headers
  const headers = Object.keys(rawData[0]);
  const { mapping, detected, unmapped } = autoMapHeaders(headers, 'CC', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  if (unmapped.length > 0) {
    console.warn(`CC file ${filename}: Unable to map required fields: ${unmapped.join(', ')}`);
  }

  // Forward-fill team/subgroup for grouped data
  let lastTeam: string | null = null;

  rawData.forEach((row, idx) => {
    try {
      // Skip header/total rows
      const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
      if (!mentorNameRaw || String(mentorNameRaw).toLowerCase().includes('total')) {
        return;
      }

      const mentorName = normalizeName(mentorNameRaw);
      if (!mentorName) {
        result.rejected.push({ row: idx + 2, reason: 'Missing mentor name', data: row });
        return;
      }

      // Forward-fill team
      const teamRaw = getMappedValue(row, 'teamName', mapping);
      if (teamRaw) {
        lastTeam = normalizeTeamName(teamRaw);
      }

      const ccPct = cleanPercentValue(getMappedValue(row, 'ccPct', mapping));
      const scPct = cleanPercentValue(getMappedValue(row, 'scPct', mapping));

      if (ccPct === null) {
        result.rejected.push({ row: idx + 2, reason: 'Missing CC%', data: row });
        return;
      }

      // Default to current month if no date
      const periodDate = parseDate(getMappedValue(row, 'periodDate', mapping)) || new Date();
      const weekOfMonth = getWeekOfMonth(periodDate);

      const transformed: TransformedRow = {
        mentorName,
        teamName: lastTeam || undefined,
        periodDate,
        weekOfMonth,
        ccPct,
        scPct: scPct !== null ? scPct : undefined,
        checksum: generateChecksum(mentorName, periodDate),
        sourceType: 'CC'
      };

      result.accepted.push(transformed);
    } catch (error) {
      result.rejected.push({
        row: idx + 2,
        reason: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        data: row
      });
    }
  });

  return result;
}

/**
 * Transform Fixed Rate file
 */
export function transformFixedFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'FIXED',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, detected } = autoMapHeaders(headers, 'FIXED', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  // Group by mentor and aggregate
  const mentorMap: Map<string, { fixed: number; total: number; team?: string; date?: Date }> = new Map();

  rawData.forEach((row, idx) => {
    const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
    if (!mentorNameRaw) return;

    const mentorName = normalizeName(mentorNameRaw);
    const teamName = normalizeTeamName(getMappedValue(row, 'teamName', mapping));
    const periodDate = parseDate(getMappedValue(row, 'periodDate', mapping));

    const fixedStudents = cleanIntValue(getMappedValue(row, 'fixedStudents', mapping)) || 0;
    const totalStudents = cleanIntValue(getMappedValue(row, 'totalStudents', mapping)) || 0;

    if (!mentorMap.has(mentorName)) {
      mentorMap.set(mentorName, { fixed: 0, total: 0, team: teamName, date: periodDate || undefined });
    }

    const data = mentorMap.get(mentorName)!;
    data.fixed += fixedStudents;
    data.total += totalStudents;
  });

  // Convert to transformed rows
  mentorMap.forEach((data, mentorName) => {
    if (data.total === 0) {
      result.rejected.push({ row: 0, reason: `Mentor ${mentorName} has no total students` });
      return;
    }

    const fixedPct = (data.fixed / data.total) * 100;
    const periodDate = data.date || new Date();
    const weekOfMonth = getWeekOfMonth(periodDate);

    result.accepted.push({
      mentorName,
      teamName: data.team,
      periodDate,
      weekOfMonth,
      fixedPct,
      checksum: generateChecksum(mentorName, periodDate),
      sourceType: 'FIXED'
    });
  });

  return result;
}

/**
 * Transform Upgrade Rate file
 */
export function transformUpgradeFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'UP',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, detected } = autoMapHeaders(headers, 'UP', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  let lastTeam: string | null = null;

  rawData.forEach((row, idx) => {
    try {
      const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
      if (!mentorNameRaw) return;

      const mentorName = normalizeName(mentorNameRaw);

      // Forward-fill team
      const teamRaw = getMappedValue(row, 'teamName', mapping);
      if (teamRaw) {
        lastTeam = normalizeTeamName(teamRaw);
      }

      const upPct = cleanPercentValue(getMappedValue(row, 'upPct', mapping));
      if (upPct === null) {
        result.rejected.push({ row: idx + 2, reason: 'Missing upgrade %', data: row });
        return;
      }

      const periodDate = parseDate(getMappedValue(row, 'periodDate', mapping)) || new Date();
      const weekOfMonth = getWeekOfMonth(periodDate);

      result.accepted.push({
        mentorName,
        teamName: lastTeam || undefined,
        periodDate,
        weekOfMonth,
        upPct,
        checksum: generateChecksum(mentorName, periodDate),
        sourceType: 'UP'
      });
    } catch (error) {
      result.rejected.push({
        row: idx + 2,
        reason: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        data: row
      });
    }
  });

  return result;
}

/**
 * Transform Referral file
 */
export function transformReferralFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'RE',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, detected } = autoMapHeaders(headers, 'RE', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  let lastTeam: string | null = null;

  rawData.forEach((row, idx) => {
    try {
      const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
      if (!mentorNameRaw) return;

      const mentorName = normalizeName(mentorNameRaw);

      const teamRaw = getMappedValue(row, 'teamName', mapping);
      if (teamRaw) {
        lastTeam = normalizeTeamName(teamRaw);
      }

      const referralLeads = cleanIntValue(getMappedValue(row, 'referralLeads', mapping));
      const referralShowups = cleanIntValue(getMappedValue(row, 'referralShowups', mapping));
      const referralPaid = cleanIntValue(getMappedValue(row, 'referralPaid', mapping));

      // Achievement can be provided or computed
      let referralAchievementPct = cleanPercentValue(getMappedValue(row, 'referralAchievementPct', mapping));

      // If achievement is a decimal ≤2, treat as decimal
      const achievementRaw = getMappedValue(row, 'referralAchievementPct', mapping);
      if (achievementRaw !== null && achievementRaw !== undefined) {
        const num = cleanNumericValue(achievementRaw);
        if (num !== null && num <= 2) {
          referralAchievementPct = num * 100;
        }
      }

      if (!referralLeads && !referralShowups && !referralPaid && !referralAchievementPct) {
        return; // Skip empty rows
      }

      const periodDate = parseDate(getMappedValue(row, 'periodDate', mapping)) || new Date();
      const weekOfMonth = getWeekOfMonth(periodDate);

      result.accepted.push({
        mentorName,
        teamName: lastTeam || undefined,
        periodDate,
        weekOfMonth,
        referralLeads: referralLeads !== null ? referralLeads : undefined,
        referralShowups: referralShowups !== null ? referralShowups : undefined,
        referralPaid: referralPaid !== null ? referralPaid : undefined,
        referralAchievementPct: referralAchievementPct !== null ? referralAchievementPct : undefined,
        checksum: generateChecksum(mentorName, periodDate),
        sourceType: 'RE'
      });
    } catch (error) {
      result.rejected.push({
        row: idx + 2,
        reason: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        data: row
      });
    }
  });

  return result;
}

/**
 * Transform All Leads file
 */
export function transformAllLeadsFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'ALL_LEADS',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, detected } = autoMapHeaders(headers, 'ALL_LEADS', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  let lastTeam: string | null = null;

  rawData.forEach((row, idx) => {
    try {
      const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
      if (!mentorNameRaw) return;

      const mentorName = normalizeName(mentorNameRaw);

      const teamRaw = getMappedValue(row, 'teamName', mapping);
      if (teamRaw) {
        lastTeam = normalizeTeamName(teamRaw);
      }

      const totalLeads = cleanIntValue(getMappedValue(row, 'totalLeads', mapping));
      const recoveredLeads = cleanIntValue(getMappedValue(row, 'recoveredLeads', mapping));
      const unrecoveredLeads = cleanIntValue(getMappedValue(row, 'unrecoveredLeads', mapping));

      if (!totalLeads && !recoveredLeads && !unrecoveredLeads) {
        return; // Skip empty rows
      }

      // Compute conversion %
      let conversionPct: number | undefined;
      if (totalLeads !== null && totalLeads > 0 && recoveredLeads !== null) {
        conversionPct = (recoveredLeads / totalLeads) * 100;
      }

      // Parse notes
      const notesRaw = getMappedValue(row, 'notes', mapping);
      const notes = notesRaw ? parseNotes(notesRaw) : undefined;

      const periodDate = parseDate(getMappedValue(row, 'periodDate', mapping)) || new Date();
      const weekOfMonth = getWeekOfMonth(periodDate);

      result.accepted.push({
        mentorName,
        teamName: lastTeam || undefined,
        periodDate,
        weekOfMonth,
        totalLeads: totalLeads !== null ? totalLeads : undefined,
        recoveredLeads: recoveredLeads !== null ? recoveredLeads : undefined,
        unrecoveredLeads: unrecoveredLeads !== null ? unrecoveredLeads : undefined,
        conversionPct,
        notes,
        checksum: generateChecksum(mentorName, periodDate),
        sourceType: 'ALL_LEADS'
      });
    } catch (error) {
      result.rejected.push({
        row: idx + 2,
        reason: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        data: row
      });
    }
  });

  return result;
}

/**
 * Transform Teams mapping file
 */
export function transformTeamsFile(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const result: TransformResult = {
    source: 'TEAMS',
    file: filename,
    received: rawData.length,
    accepted: [],
    rejected: [],
    columnsDetected: [],
    columnsMapped: {}
  };

  if (rawData.length === 0) {
    result.rejected.push({ row: 0, reason: 'Empty file' });
    return result;
  }

  const headers = Object.keys(rawData[0]);
  const { mapping, detected } = autoMapHeaders(headers, 'TEAMS', presetMapping);
  result.columnsDetected = detected;
  result.columnsMapped = mapping;

  rawData.forEach((row, idx) => {
    try {
      const mentorNameRaw = getMappedValue(row, 'mentorName', mapping);
      const teamNameRaw = getMappedValue(row, 'teamName', mapping);

      if (!mentorNameRaw || !teamNameRaw) {
        result.rejected.push({ row: idx + 2, reason: 'Missing mentor or team name', data: row });
        return;
      }

      const mentorName = normalizeName(mentorNameRaw);
      const teamName = normalizeTeamName(teamNameRaw);

      const periodDate = new Date(); // Teams mapping is not time-specific
      const weekOfMonth = getWeekOfMonth(periodDate);

      result.accepted.push({
        mentorName,
        teamName,
        periodDate,
        weekOfMonth,
        checksum: generateChecksum(mentorName, periodDate),
        sourceType: 'TEAMS'
      });
    } catch (error) {
      result.rejected.push({
        row: idx + 2,
        reason: `Transform error: ${error instanceof Error ? error.message : 'Unknown'}`,
        data: row
      });
    }
  });

  return result;
}

/**
 * Auto-transform based on detected source type
 */
export function autoTransform(
  workbook: XLSX.WorkBook,
  filename: string,
  presetMapping?: ColumnMapping
): TransformResult | null {
  // Detect source type from first sheet headers
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawData.length === 0) {
    return null;
  }

  const headers = Object.keys(rawData[0]);
  const sourceType = detectSourceType(headers);

  if (!sourceType) {
    console.warn(`Unable to detect source type for file: ${filename}`);
    return null;
  }

  console.log(`Detected source type: ${sourceType} for file: ${filename}`);

  switch (sourceType) {
    case 'CC':
      return transformCCFile(workbook, filename, presetMapping);
    case 'FIXED':
      return transformFixedFile(workbook, filename, presetMapping);
    case 'UP':
      return transformUpgradeFile(workbook, filename, presetMapping);
    case 'RE':
      return transformReferralFile(workbook, filename, presetMapping);
    case 'ALL_LEADS':
      return transformAllLeadsFile(workbook, filename, presetMapping);
    case 'TEAMS':
      return transformTeamsFile(workbook, filename, presetMapping);
    default:
      return null;
  }
}
