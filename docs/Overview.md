# Overview

## System Architecture

This platform is a full-stack monolith combining Express (backend API) and React + Vite (frontend). It provides real-time analytics for operations teams.

## Roles

- **Admin**: Full system access. Manages ingestion, configures targets/weights/alerts, views all teams.
- **Team Leader**: Views own team's data. Access to dashboards, agents, alerts. Cannot modify config.

## Core Metrics

**Primary Metrics** (agent-level, percentage-based):
- **CC** (Class Consumption %): Measures class attendance/participation
- **SC** (Super-CC %): Advanced class engagement
- **UP** (Upgrade %): Customer upgrade rate
- **Fixed** (Fixed %): Fixed commitments met

**Referral Funnel**:
- Leads → Showups → Paid
- **Referral Achievement %**: Derived from funnel conversion

**Lead Recovery**:
- Total Leads, Recovered, Unrecovered (with notes)
- **Conversion %**: recovered ÷ total

## Targets & Pacing

**Default Monthly Targets**:
- CC: 80%, SC: 15%, UP: 25%, Fixed: 60%
- Referral Achievement: 80%, Conversion: 30%

**Weekly Pacing** (divides monthly target):
- Week 1: ÷4 (25%), Week 2: ÷3 (33%), Week 3: ÷2 (50%), Week 4: ÷1 (100%)

**Status Thresholds**:
- **Above**: ≥100% of target
- **Warning**: ≥90% and <100%
- **Below**: <90%

**Weights** (for composite score):
- CC: 25%, SC: 25%, UP: 25%, Fixed: 25% (must sum to 100%)

**Weighted Score Formula**:
```
Σ( clamp(actual/target, 0, 1.5) × weight )
```

**Targets Achieved**: Count of primary metrics ≥100% (0–4)

**Ranking**: Agents ranked by weighted score within filtered cohort

## Alerts

Alert rules evaluate metrics each period and trigger notifications based on:
- **Below Target**: Below X% for Y consecutive periods
- **Missing Data**: No data for Z periods
- **Variance Spike**: Sudden performance drop

Alerts shown in Meeting Alerts view with severity (INFO, WARNING, CRITICAL).

## AI Features

- **Coach** (`/api/ai/coach`): Actionable advice based on metrics, targets, pacing
- **Help** (`/api/ai/help`): Q&A grounded in docs with citations

Both use OpenRouter (server-side only). Responses cached 5 min. Rate-limited.

## Data Flow

1. Admin uploads Excel or connects Google Sheets
2. ETL normalizes to Agent schema (see Ingestion.md)
3. Metrics stored with weekly/monthly snapshots
4. Frontend fetches aggregated data
5. Charts/tables render with Recharts + TanStack Table
6. AI endpoints provide insights on demand
