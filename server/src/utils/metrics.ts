import { Status } from '@prisma/client';

export interface TargetConfig {
  ccTarget: number;
  scTarget: number;
  upTarget: number;
  fixedTarget: number;
  referralAchievementTarget: number;
  conversionTarget: number;
  aboveThreshold: number;
  warningThreshold: number;
  ccWeight: number;
  scWeight: number;
  upWeight: number;
  fixedWeight: number;
}

export interface MetricValues {
  ccPct: number | null;
  scPct: number | null;
  upPct: number | null;
  fixedPct: number | null;
}

/**
 * Weekly pacing divisors for MetricWave
 * W1 ÷ 4, W2 ÷ 3, W3 ÷ 2, W4 = full target
 */
export function getPacingDivisor(weekOfMonth: number): number {
  switch (weekOfMonth) {
    case 1:
      return 4;
    case 2:
      return 3;
    case 3:
      return 2;
    case 4:
    default:
      return 1;
  }
}

/**
 * Calculate paced target based on week of month
 */
export function calculatePacedTarget(monthlyTarget: number, weekOfMonth: number): number {
  return monthlyTarget / getPacingDivisor(weekOfMonth);
}

/**
 * Calculate weighted score using MetricWave formula:
 * Σ( clamp(actual/target, 0, 1.5) × weight )
 *
 * This allows agents to exceed 100% (up to 150%) while capping overperformance
 */
export function calculateWeightedScore(metrics: MetricValues, targets: TargetConfig): number {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const ccScore = metrics.ccPct
    ? clamp(metrics.ccPct / targets.ccTarget, 0, 1.5) * targets.ccWeight
    : 0;
  const scScore = metrics.scPct
    ? clamp(metrics.scPct / targets.scTarget, 0, 1.5) * targets.scWeight
    : 0;
  const upScore = metrics.upPct
    ? clamp(metrics.upPct / targets.upTarget, 0, 1.5) * targets.upWeight
    : 0;
  const fixedScore = metrics.fixedPct
    ? clamp(metrics.fixedPct / targets.fixedTarget, 0, 1.5) * targets.fixedWeight
    : 0;

  return ccScore + scScore + upScore + fixedScore;
}

/**
 * Calculate status based on weighted score
 * ≥100% of total weights → ABOVE
 * ≥90% of total weights → WARNING
 * <90% → BELOW
 */
export function calculateStatus(weightedScore: number, targets: TargetConfig): Status {
  const totalWeights = targets.ccWeight + targets.scWeight + targets.upWeight + targets.fixedWeight;
  const completionRatio = weightedScore / totalWeights;

  if (completionRatio >= targets.aboveThreshold / 100) return 'ABOVE';
  if (completionRatio >= targets.warningThreshold / 100) return 'WARNING';
  return 'BELOW';
}

/**
 * Count how many targets the agent hit (0-4)
 */
export function countTargetsHit(metrics: MetricValues, targets: TargetConfig): number {
  return [
    metrics.ccPct !== null && metrics.ccPct >= targets.ccTarget,
    metrics.scPct !== null && metrics.scPct >= targets.scTarget,
    metrics.upPct !== null && metrics.upPct >= targets.upTarget,
    metrics.fixedPct !== null && metrics.fixedPct >= targets.fixedTarget,
  ].filter(Boolean).length;
}

/**
 * Validate that weights sum to 100%
 * Throws error if not valid
 */
export function validateWeights(targets: TargetConfig): void {
  const total = targets.ccWeight + targets.scWeight + targets.upWeight + targets.fixedWeight;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Weights must sum to 100%, got ${total.toFixed(2)}%`);
  }
}
