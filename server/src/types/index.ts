import { z } from 'zod';

// Shared TypeScript types for the application

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'LEADER';

export interface Agent {
  agent_id: string;
  agent_name: string;
  team_id: string;
  team_name: string;
  cc_pct?: number;
  sc_pct?: number;
  up_pct?: number;
  fixed_pct?: number;
  referral_leads?: number;
  referral_showups?: number;
  referral_paid?: number;
  referral_achievement_pct?: number;
  total_leads?: number;
  recovered_leads?: number;
  unrecovered_leads?: number;
  unrecovered_notes?: string[];
  conversion_pct?: number;
  weighted_score?: number;
}

export interface IngestionReport {
  source: string;
  sourceDetail?: string;
  recordsProcessed: number;
  recordsAccepted: number;
  recordsRejected: number;
  errors: IngestionError[];
  createdCount: number;
  updatedCount: number;
  checksum: string;
}

export interface IngestionError {
  row: number;
  field?: string;
  reason: string;
  value?: any;
}

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

export interface PacingConfig {
  week1Divisor: number; // 4
  week2Divisor: number; // 3
  week3Divisor: number; // 2
  week4Divisor: number; // 1 (full target)
}

export type StatusType = 'ABOVE' | 'WARNING' | 'BELOW';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  teamId?: string;
}

export interface AICoachRequest {
  agentId?: string;
  teamId?: string;
  question: string;
  metrics?: Record<string, any>;
  targetConfig?: TargetConfig;
}

export interface AIHelpRequest {
  question: string;
}

export interface AIResponse {
  answer: string;
  citations?: string[];
  cached?: boolean;
}
