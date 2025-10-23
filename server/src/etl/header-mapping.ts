/**
 * Header Mapping and Auto-Detection
 * Flexible column mapping with preset support
 */

import { normalizeHeader } from './cleaners.js';

export type SourceType = 'CC' | 'FIXED' | 'RE' | 'UP' | 'ALL_LEADS' | 'TEAMS';

export interface ColumnMapping {
  [targetField: string]: string; // e.g., { mentorName: 'CM Name', ccPct: 'Class Consumption %' }
}

/**
 * Default column mapping variants for each target field
 * Auto-detection tries these in order
 */
export const DEFAULT_COLUMN_MAPPINGS: Record<string, string[]> = {
  // Common fields
  mentorId: ['mentor_id', 'mentorid', 'id', 'employee_id', 'cm_id', 'agent_id'],
  mentorName: ['mentor_name', 'name', 'mentor', 'employee', 'cm_name', 'full_name', 'cm', 'agent_name',
               'last_cm_name', 'lp', 'lp_employee', 'cm name'], // Support user's format
  teamName: ['team', 'team_name', 'teamname', 'subgroup', 'sub_group', 'group',
             'last_cm_team', 'lp_group', 'team_', 'team '], // Support user's format with trailing space
  periodDate: ['date', 'period', 'period_date', 'day', 'date_recorded', 'month', 'week'],

  // CC source
  ccPct: [
    'cc', 'cc_pct', 'cc%', 'cc_%', 'class_consumption', 'consumption_%', 'consumption_pct',
    'class_consumption_%', 'class_consumption_pct', 'class_consumption_percentage',
    '>=12', '>= 12', 'number_of_finished_students_>=12_class_consumption' // Support user's format
  ],
  scPct: [
    'sc', 'sc_pct', 'sc%', 'sc_%', 'super_cc', 'scc_%', 'super_consumption',
    'super_class', 'super_class_%', 'super_class_pct',
    'm1-m4_super_class_consumption', 'm1-m4_scc', 'super_class_consumption' // Support user's format
  ],

  // UP source
  upPct: [
    'up', 'up_pct', 'up%', 'up_%', 'upgrade', 'upgrade_%', 'upgrade_pct',
    'cumulative_upgrade_rate', 'upgrade_rate', 'cumulative_upgrade_rate_%',
    'm-2累积升舱率m-2_cumulative_upgrade_rate', 'm-2_cumulative_upgrade_rate',
    'm-2累积升舱率', 'm2_cumulative_upgrade_rate' // Support user's format with Chinese
  ],

  // Fixed source
  fixedPct: ['fixed', 'fixed_pct', 'fixed%', 'fixed_%', 'fixed_rate', 'fixed_rate_%'],
  fixedStudents: ['fixed_students', 'fixed_count', 'fixed_plans', 'number_of_fixed_plans'],
  totalStudents: ['total_students', 'total', 'student_count', 'students'],
  fixedOrNot: ['fixed_or_not', 'fixed or not', 'is_fixed', 'isfixed'], // Boolean column for per-student fixed status

  // Referral source
  referralLeads: ['leads', 'referral_leads', 'total_referrals', 'referrals', 'referral_lead_generated'],
  referralShowups: ['showups', 'referral_showups', 'appointments', 'shows', 'show_ups', 'referral_show_ups',
                   'show up', 'show_up', 'show up %', 'show up%'], // Support user's format
  referralPaid: ['paid', 'referral_paid', 'conversions', 'converted', 'referral_conversions'],
  referralAchievementPct: [
    'achievement', 'achievement%', 'achievement_pct', 'achievement_%',
    'referral_achievement', 'referral_achievement_%', 'referral_achievement_pct',
    'leads_ach%', 'leads_ach_%', 'leads_ach_pct', 'leads ach%' // Support user's format
  ],

  // All Leads source
  totalLeads: ['total', 'all_leads', 'total_leads', 'total_lead_generated', 'lead_count'],
  recoveredLeads: ['recovered', 'recovered_leads', 'recovered_count', 'successful_recovery'],
  unrecoveredLeads: ['unrecovered', 'unrecovered_leads', 'unrecovered_count', 'failed_recovery'],
  notes: ['notes', 'unrecovered_notes', 'comments', 'recovery_notes', 'student_notes']
};

/**
 * Auto-map headers from Excel to target fields
 */
export function autoMapHeaders(
  headers: string[],
  sourceType?: SourceType,
  customMapping?: ColumnMapping
): { mapping: ColumnMapping; detected: string[]; unmapped: string[] } {
  const mapping: ColumnMapping = {};
  const detected: string[] = [];
  const unmapped: string[] = [];

  // Normalize all headers for matching
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  // Try to map each target field
  for (const [targetField, variants] of Object.entries(DEFAULT_COLUMN_MAPPINGS)) {
    // Check custom mapping first
    if (customMapping && customMapping[targetField]) {
      mapping[targetField] = customMapping[targetField];
      detected.push(targetField);
      continue;
    }

    // Try to find matching header
    let found = false;
    for (const variant of variants) {
      const normalizedVariant = normalizeHeader(variant);
      const idx = normalizedHeaders.indexOf(normalizedVariant);

      if (idx >= 0) {
        mapping[targetField] = headers[idx]; // Use original header case
        detected.push(targetField);
        found = true;
        break;
      }
    }

    if (!found && isRequiredField(targetField, sourceType)) {
      unmapped.push(targetField);
    }
  }

  return { mapping, detected, unmapped };
}

/**
 * Check if field is required for the given source type
 */
function isRequiredField(field: string, sourceType?: SourceType): boolean {
  // Common required fields
  const commonRequired = ['mentorName'];

  if (commonRequired.includes(field)) return true;

  if (!sourceType) return false;

  const sourceRequirements: Record<SourceType, string[]> = {
    CC: ['ccPct'],
    FIXED: ['fixedPct', 'totalStudents'],
    RE: ['referralLeads'],
    UP: ['upPct'],
    ALL_LEADS: ['totalLeads'],
    TEAMS: ['teamName']
  };

  return sourceRequirements[sourceType]?.includes(field) || false;
}

/**
 * Detect source type from headers and content
 */
export function detectSourceType(headers: string[]): SourceType | null {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  // Check for signature fields
  const hasCC = normalizedHeaders.some(h =>
    h.includes('class_consumption') || h.includes('cc_pct') || h.includes('cc%') ||
    (h.includes('12') && h.includes('class_consumption')) || h === '>=12' || h === '12'
  );
  const hasSC = normalizedHeaders.some(h =>
    h.includes('super_cc') || h.includes('sc_pct') || h.includes('sc%') ||
    h.includes('super_class_consumption') || h.includes('super_class')
  );
  const hasFixed = normalizedHeaders.some(h =>
    (h.includes('fixed') && (h.includes('pct') || h.includes('%') || h.includes('rate'))) ||
    (h.includes('fixed') && (h.includes('or') || h.includes('not'))) // Student-level: "Fixed or Not"
  );
  const hasUpgrade = normalizedHeaders.some(h =>
    h.includes('upgrade') || h.includes('cumulative_upgrade_rate')
  );
  const hasReferral = normalizedHeaders.some(h =>
    h.includes('referral') || h.includes('showup') || h.includes('achievement') ||
    h.includes('show_up') || (h === 'leads' || h.includes('leads_ach'))
  );
  const hasLeads = normalizedHeaders.some(h =>
    h.includes('recovered') || h.includes('unrecovered') || h.includes('all_leads')
  );
  const hasTeam = normalizedHeaders.some(h =>
    h.includes('team') || h.includes('subgroup')
  );

  // Determine source by signature fields
  if (hasCC && hasSC) return 'CC';
  if (hasUpgrade) return 'UP';
  if (hasReferral) return 'RE';
  if (hasFixed) return 'FIXED';
  if (hasLeads) return 'ALL_LEADS';
  if (hasTeam && headers.length <= 5) return 'TEAMS'; // Simple team mapping file

  return null;
}

/**
 * Get value from row using mapped field name
 */
export function getMappedValue(
  row: any,
  targetField: string,
  mapping: ColumnMapping
): any {
  const sourceField = mapping[targetField];
  if (!sourceField) return undefined;

  return row[sourceField];
}
