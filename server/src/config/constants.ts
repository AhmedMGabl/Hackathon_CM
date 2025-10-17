import { TargetConfig, PacingConfig } from '@/types';

// Default target values (monthly)
export const DEFAULT_TARGETS: TargetConfig = {
  ccTarget: 80,
  scTarget: 15,
  upTarget: 25,
  fixedTarget: 60,
  referralAchievementTarget: 80,
  conversionTarget: 30,
  aboveThreshold: 100, // ≥100% of target
  warningThreshold: 90, // ≥90% of target
  ccWeight: 25,
  scWeight: 25,
  upWeight: 25,
  fixedWeight: 25,
};

// Weekly pacing divisors
export const PACING_CONFIG: PacingConfig = {
  week1Divisor: 4, // 25% of monthly target
  week2Divisor: 3, // 33% of monthly target
  week3Divisor: 2, // 50% of monthly target
  week4Divisor: 1, // 100% of monthly target
};

// Status thresholds
export const STATUS_THRESHOLDS = {
  ABOVE: 100, // ≥100%
  WARNING: 90, // ≥90%
  BELOW: 0, // <90%
} as const;

// Excel/Sheets header mappings
export const HEADER_MAPPINGS = {
  CC: {
    agentId: ['agent_id', 'agentid', 'id', 'agent id'],
    agentName: ['agent_name', 'agentname', 'name', 'agent name'],
    teamId: ['team_id', 'teamid', 'team id'],
    teamName: ['team_name', 'teamname', 'team', 'team name'],
    ccPct: ['cc_pct', 'cc%', 'cc', 'class_consumption', 'class consumption'],
    scPct: ['sc_pct', 'sc%', 'sc', 'super_cc', 'super cc'],
  },
  FIXED: {
    agentId: ['agent_id', 'agentid', 'id', 'agent id'],
    agentName: ['agent_name', 'agentname', 'name', 'agent name'],
    teamId: ['team_id', 'teamid', 'team id'],
    teamName: ['team_name', 'teamname', 'team', 'team name'],
    fixedPct: ['fixed_pct', 'fixed%', 'fixed'],
  },
  REFERRAL: {
    agentId: ['agent_id', 'agentid', 'id', 'agent id'],
    agentName: ['agent_name', 'agentname', 'name', 'agent name'],
    teamId: ['team_id', 'teamid', 'team id'],
    teamName: ['team_name', 'teamname', 'team', 'team name'],
    referralLeads: ['leads', 'referral_leads', 'total_leads'],
    referralShowups: ['showups', 'referral_showups', 'show_ups'],
    referralPaid: ['paid', 'referral_paid', 'converted'],
    referralAchievementPct: ['achievement', 'achievement%', 'achievement_pct'],
  },
  UPGRADE: {
    agentId: ['agent_id', 'agentid', 'id', 'agent id'],
    agentName: ['agent_name', 'agentname', 'name', 'agent name'],
    teamId: ['team_id', 'teamid', 'team id'],
    teamName: ['team_name', 'teamname', 'team', 'team name'],
    upPct: ['up_pct', 'up%', 'up', 'upgrade', 'upgrade%'],
  },
  ALL_LEADS: {
    agentId: ['agent_id', 'agentid', 'id', 'agent id'],
    agentName: ['agent_name', 'agentname', 'name', 'agent name'],
    teamId: ['team_id', 'teamid', 'team id'],
    teamName: ['team_name', 'teamname', 'team', 'team name'],
    totalLeads: ['total', 'total_leads', 'all_leads'],
    recoveredLeads: ['recovered', 'recovered_leads'],
    unrecoveredLeads: ['unrecovered', 'unrecovered_leads'],
    unrecoveredNotes: ['notes', 'unrecovered_notes', 'comments'],
  },
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 200,
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ],
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls'],
} as const;

// AI Configuration
export const AI_CONFIG = {
  MAX_CONTEXT_TOKENS: 4000,
  RESPONSE_MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// Rate limiting
export const RATE_LIMITS = {
  AI_COACH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
  },
  AI_HELP: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
} as const;
