import { StatusType } from '../types/index.js';
import { STATUS_THRESHOLDS } from '../config/constants.js';

/**
 * Calculate percentage: (actual / target) * 100
 */
export function pct(actual: number, target: number): number {
  if (target === 0) return 0;
  return (actual / target) * 100;
}

/**
 * Determine status based on percentage of target achieved
 */
export function status(achievedPct: number): StatusType {
  if (achievedPct >= STATUS_THRESHOLDS.ABOVE) return 'ABOVE';
  if (achievedPct >= STATUS_THRESHOLDS.WARNING) return 'WARNING';
  return 'BELOW';
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate weighted score based on targets and weights
 * Formula: Σ( clamp(actual/target, 0, 1.5) × weight )
 */
export function calculateWeightedScore(
  metrics: {
    cc?: number;
    sc?: number;
    up?: number;
    fixed?: number;
  },
  targets: {
    ccTarget: number;
    scTarget: number;
    upTarget: number;
    fixedTarget: number;
  },
  weights: {
    ccWeight: number;
    scWeight: number;
    upWeight: number;
    fixedWeight: number;
  }
): number {
  let score = 0;

  if (metrics.cc !== undefined && targets.ccTarget > 0) {
    score += clamp(metrics.cc / targets.ccTarget, 0, 1.5) * (weights.ccWeight / 100);
  }

  if (metrics.sc !== undefined && targets.scTarget > 0) {
    score += clamp(metrics.sc / targets.scTarget, 0, 1.5) * (weights.scWeight / 100);
  }

  if (metrics.up !== undefined && targets.upTarget > 0) {
    score += clamp(metrics.up / targets.upTarget, 0, 1.5) * (weights.upWeight / 100);
  }

  if (metrics.fixed !== undefined && targets.fixedTarget > 0) {
    score += clamp(metrics.fixed / targets.fixedTarget, 0, 1.5) * (weights.fixedWeight / 100);
  }

  return score;
}

/**
 * Count how many targets were achieved (≥100%)
 */
export function countTargetsHit(
  metrics: {
    cc?: number;
    sc?: number;
    up?: number;
    fixed?: number;
  },
  targets: {
    ccTarget: number;
    scTarget: number;
    upTarget: number;
    fixedTarget: number;
  }
): number {
  let count = 0;

  if (metrics.cc !== undefined && metrics.cc >= targets.ccTarget) count++;
  if (metrics.sc !== undefined && metrics.sc >= targets.scTarget) count++;
  if (metrics.up !== undefined && metrics.up >= targets.upTarget) count++;
  if (metrics.fixed !== undefined && metrics.fixed >= targets.fixedTarget) count++;

  return count;
}

/**
 * Safely parse percentage from various formats (0.8, 80, "80%") → 80
 */
export function parsePercentage(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  let numValue: number;

  if (typeof value === 'string') {
    // Remove % sign and whitespace
    const cleaned = value.trim().replace('%', '');
    numValue = parseFloat(cleaned);
  } else {
    numValue = parseFloat(value);
  }

  if (isNaN(numValue)) return null;

  // If value is between 0 and 1, assume it's a decimal (0.8 → 80)
  if (numValue > 0 && numValue <= 1) {
    return numValue * 100;
  }

  return numValue;
}

/**
 * Generate a simple checksum from data (for deduplication)
 */
export function generateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get paced target for a given week (1-4)
 */
export function getPacedTarget(monthlyTarget: number, week: number): number {
  const divisors = [4, 3, 2, 1]; // Week 1-4
  const divisor = divisors[week - 1] || 1;
  return monthlyTarget / divisor;
}

/**
 * Sanitize and validate team/agent IDs
 */
export function sanitizeId(id: string): string {
  return id.trim().toUpperCase().replace(/\s+/g, '_');
}
