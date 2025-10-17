# Dashboards

## Overview (Team Health)

**Purpose**: High-level team performance snapshot

**Components**:
- **KPI Cards**: 4 primary metrics with sparklines, trend badges
- **Weekly Pacing Chart**: ComposedChart (actual vs paced target)
- **Team Radar Chart**: Multi-metric shape comparison
- **Referral Sankey**: Funnel flow visualization (Leads → Showups → Paid)

**Filters**: Search, team selector, status chips, date/week picker

**Permissions**: All users (scoped by team for leaders)

## Individuals

**Purpose**: Agent-level drill-down with rankings

**Components**:
- **TanStack Table**: Sortable, filterable, paginated
- **Columns**: Agent, Team, CC/SC/UP/Fixed chips, Targets Hit (0–4), Rank, Weighted Score
- **Column Chooser**: Toggle visibility
- **Export**: CSV download

**Agent Detail Modal**:
- ComposedChart: 4 metrics vs weekly paced targets
- Referral mini-funnel (Bar/Area)
- Conversion trend line
- Unrecovered leads drill-down with notes

**Filters**: Full-text search, team, status, metric range sliders

**Permissions**: All users (team-scoped for leaders)

## Targets Tracker

**Purpose**: Visualize pacing vs actual, view/edit config

**Components**:
- **Pacing Chart**: Area/Line showing weekly progress vs targets
- **Target Config Panel**: Read-only for leaders, sliders for admins
- **Weight Gauge**: Visual representation ensuring 100% total

**Admin Features**:
- Edit monthly targets (sliders with validation)
- Edit weights (auto-adjusting sliders with 100% guard)
- Preview impact on scores

**Permissions**: View (all), Edit (admin only)

## Meeting Alerts

**Purpose**: Identify at-risk agents for coaching

**Components**:
- **Alert Table**: Severity, Agent, Team, Metric, Message, Timestamp
- **Trend Bar**: Mini-chart per agent showing recent performance
- **Filters**: Severity, team, dismissed status
- **Export**: CSV/PDF with charts

**Alert Rules** (admin-configured):
- Below target by X% for Y periods
- Missing data for Z periods
- Variance spike

**Permissions**: All users (team-scoped for leaders)

## Chart Types Used

- **Line/Area**: Trends over time
- **Bar/ComposedChart**: Comparisons, multi-series
- **Sparkline**: Inline mini-trends
- **Radar**: Multi-dimensional team shape
- **Sankey**: Funnel flows
- **Treemap**: (Future) Team size vs performance

All charts use professional palette (see design-tokens.ts), responsive, accessible.
