# Alerts

## Alert Types

### 1. Below Target Alert
Triggers when agent is below target threshold for consecutive periods.

**Configuration**:
- `threshold`: Percentage below target (e.g., 90%)
- `consecutivePeriods`: Number of periods (e.g., 2 weeks)
- `metric`: Which metric to monitor (CC, SC, UP, Fixed, or Overall)

**Example**: Alert if CC < 90% of target for 2 consecutive weeks.

### 2. Missing Data Alert
Triggers when no data received for an agent.

**Configuration**:
- `periods`: Number of missing periods (e.g., 1 week)

### 3. Variance Spike Alert
Triggers on sudden performance drops.

**Configuration**:
- `threshold`: Percentage drop (e.g., 15%)
- `comparisonWindow`: Compare to previous N periods

**Example**: Alert if performance drops >15% from previous week average.

## Severity Levels

- **INFO**: Positive milestones (all targets achieved)
- **WARNING**: Approaching threshold, intervention may help
- **CRITICAL**: Below threshold, immediate action needed

## Alert Workflow

1. **Evaluation**: Runs after each ingestion or on schedule
2. **Triggering**: Creates `Alert` record if rule conditions met
3. **Notification**: (Future) Email, Slack, in-app bell icon
4. **Display**: Meeting Alerts page shows active alerts
5. **Dismissal**: Users can dismiss alerts (with timestamp)

## Meeting Alerts Page

**Features**:
- Table with filters (severity, team, dismissed)
- Trend mini-chart per agent (last 4 weeks)
- Quick actions: View agent detail, dismiss, export
- Export: CSV/PDF with charts and notes

**Use Case**: Team leaders prepare for 1-on-1s by reviewing alerts, identifying coaching opportunities.

## Admin Configuration

Admins create/edit alert rules via `/api/alerts/rules`:
- Define conditions (JSON schema)
- Enable/disable rules
- Set notification preferences (future)

## Privacy

Alerts are team-scoped. Leaders only see their team's alerts.
