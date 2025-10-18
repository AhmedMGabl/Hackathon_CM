/**
 * Data Merger - Combine multi-source metrics by mentor
 * Merges CC, Fixed, RE, UP, ALL_LEADS, and TEAMS data into unified records
 */

import { normalizeName } from './cleaners.js';
import type { TransformedRow, TransformResult } from './transformers.js';

export interface MergedMetric {
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
  sources: string[]; // Which sources contributed to this row
}

export interface MergeResult {
  merged: MergedMetric[];
  coverage: {
    CC?: number;
    SC?: number;
    UP?: number;
    Fixed?: number;
    Referral?: number;
    Leads?: number;
  };
  mentorCount: number;
  teamMapping: Map<string, string>; // mentor -> team
}

/**
 * Merge multiple transform results by mentor name and period
 */
export function mergeTransformResults(results: TransformResult[]): MergeResult {
  // Group by mentor + period (using normalized name as key)
  const mergeMap: Map<string, MergedMetric> = new Map();
  const teamMapping: Map<string, string> = new Map();

  // First pass: Build team mapping from TEAMS source (highest priority)
  results.forEach(result => {
    if (result.source === 'TEAMS') {
      result.accepted.forEach(row => {
        if (row.teamName) {
          teamMapping.set(row.mentorName, row.teamName);
        }
      });
    }
  });

  // Second pass: Build team mapping from other sources (lower priority)
  results.forEach(result => {
    if (result.source !== 'TEAMS') {
      result.accepted.forEach(row => {
        if (row.teamName && !teamMapping.has(row.mentorName)) {
          teamMapping.set(row.mentorName, row.teamName);
        }
      });
    }
  });

  // Third pass: Merge all metrics
  results.forEach(result => {
    result.accepted.forEach(row => {
      const key = `${row.mentorName}:${row.periodDate.toISOString().split('T')[0]}`;

      if (!mergeMap.has(key)) {
        // Initialize new merged record
        mergeMap.set(key, {
          mentorName: row.mentorName,
          teamName: teamMapping.get(row.mentorName) || row.teamName,
          periodDate: row.periodDate,
          weekOfMonth: row.weekOfMonth,
          checksum: row.checksum,
          sources: []
        });
      }

      const merged = mergeMap.get(key)!;

      // Merge fields based on source type
      switch (result.source) {
        case 'CC':
          if (row.ccPct !== undefined) merged.ccPct = row.ccPct;
          if (row.scPct !== undefined) merged.scPct = row.scPct;
          merged.sources.push('CC');
          break;

        case 'FIXED':
          if (row.fixedPct !== undefined) merged.fixedPct = row.fixedPct;
          merged.sources.push('FIXED');
          break;

        case 'UP':
          if (row.upPct !== undefined) merged.upPct = row.upPct;
          merged.sources.push('UP');
          break;

        case 'RE':
          if (row.referralLeads !== undefined) merged.referralLeads = row.referralLeads;
          if (row.referralShowups !== undefined) merged.referralShowups = row.referralShowups;
          if (row.referralPaid !== undefined) merged.referralPaid = row.referralPaid;
          if (row.referralAchievementPct !== undefined) merged.referralAchievementPct = row.referralAchievementPct;
          merged.sources.push('RE');
          break;

        case 'ALL_LEADS':
          if (row.totalLeads !== undefined) merged.totalLeads = row.totalLeads;
          if (row.recoveredLeads !== undefined) merged.recoveredLeads = row.recoveredLeads;
          if (row.unrecoveredLeads !== undefined) merged.unrecoveredLeads = row.unrecoveredLeads;
          if (row.conversionPct !== undefined) merged.conversionPct = row.conversionPct;
          if (row.notes !== undefined) merged.notes = row.notes;
          merged.sources.push('ALL_LEADS');
          break;

        case 'TEAMS':
          // Team mapping already handled in first pass
          merged.sources.push('TEAMS');
          break;
      }

      // Deduplicate sources
      merged.sources = Array.from(new Set(merged.sources));
    });
  });

  // Convert map to array
  const merged = Array.from(mergeMap.values());

  // Calculate coverage
  const coverage = calculateCoverage(merged);

  return {
    merged,
    coverage,
    mentorCount: new Set(merged.map(m => m.mentorName)).size,
    teamMapping
  };
}

/**
 * Calculate metric coverage percentages
 */
function calculateCoverage(merged: MergedMetric[]): MergeResult['coverage'] {
  if (merged.length === 0) {
    return {};
  }

  const total = merged.length;

  return {
    CC: Math.round((merged.filter(m => m.ccPct !== undefined).length / total) * 100),
    SC: Math.round((merged.filter(m => m.scPct !== undefined).length / total) * 100),
    UP: Math.round((merged.filter(m => m.upPct !== undefined).length / total) * 100),
    Fixed: Math.round((merged.filter(m => m.fixedPct !== undefined).length / total) * 100),
    Referral: Math.round((merged.filter(m => m.referralLeads !== undefined).length / total) * 100),
    Leads: Math.round((merged.filter(m => m.totalLeads !== undefined).length / total) * 100)
  };
}

/**
 * Validate merged data quality
 */
export function validateMergedData(merged: MergedMetric[]): {
  valid: MergedMetric[];
  invalid: Array<{ mentor: string; reason: string }>;
} {
  const valid: MergedMetric[] = [];
  const invalid: Array<{ mentor: string; reason: string }> = [];

  merged.forEach(metric => {
    const issues: string[] = [];

    // Check for at least one metric
    const hasAnyMetric = metric.ccPct !== undefined ||
                        metric.scPct !== undefined ||
                        metric.upPct !== undefined ||
                        metric.fixedPct !== undefined ||
                        metric.referralLeads !== undefined ||
                        metric.totalLeads !== undefined;

    if (!hasAnyMetric) {
      issues.push('No metrics provided');
    }

    // Check for valid percentages
    if (metric.ccPct !== undefined && (metric.ccPct < 0 || metric.ccPct > 200)) {
      issues.push(`Invalid CC%: ${metric.ccPct}`);
    }
    if (metric.scPct !== undefined && (metric.scPct < 0 || metric.scPct > 200)) {
      issues.push(`Invalid SC%: ${metric.scPct}`);
    }
    if (metric.upPct !== undefined && (metric.upPct < 0 || metric.upPct > 200)) {
      issues.push(`Invalid UP%: ${metric.upPct}`);
    }
    if (metric.fixedPct !== undefined && (metric.fixedPct < 0 || metric.fixedPct > 100)) {
      issues.push(`Invalid Fixed%: ${metric.fixedPct}`);
    }

    // Check for negative counts
    if (metric.referralLeads !== undefined && metric.referralLeads < 0) {
      issues.push('Negative referral leads');
    }
    if (metric.totalLeads !== undefined && metric.totalLeads < 0) {
      issues.push('Negative total leads');
    }

    if (issues.length > 0) {
      invalid.push({
        mentor: metric.mentorName,
        reason: issues.join('; ')
      });
    } else {
      valid.push(metric);
    }
  });

  return { valid, invalid };
}
