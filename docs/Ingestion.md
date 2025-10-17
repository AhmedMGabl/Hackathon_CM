# Ingestion

## Upload Sources

Five optional Excel/Sheets sources (admin can provide any subset):

| Source Key | File Form Field | Metrics Provided |
|------------|----------------|------------------|
| Class Consumption | `cc_file` | CC%, SC% |
| Fixed | `fixed_file` | Fixed% |
| Referral | `re_file` | Leads, Showups, Paid, Achievement% |
| Upgrade | `up_file` | UP% |
| All Leads | `all_leads_file` | Total, Recovered, Unrecovered, Notes |

## File Requirements

- **Format**: `.xlsx` or `.xls`
- **Size**: Max 200MB (configurable via `MAX_UPLOAD_MB`)
- **Headers**: Flexible (see Header Mapping below)
- **Required Columns**: `agent_id`, `agent_name`, `team_id` or `team_name`

## Header Mapping

Headers are case-insensitive and whitespace-tolerant. Examples:

**Common**:
- Agent ID: `agent_id`, `agentid`, `id`
- Agent Name: `agent_name`, `agentname`, `name`
- Team: `team_id`, `team_name`, `team`

**CC File**:
- `cc_pct`, `cc%`, `cc`, `class_consumption`
- `sc_pct`, `sc%`, `sc`, `super_cc`

**Fixed File**:
- `fixed_pct`, `fixed%`, `fixed`

**Referral File**:
- `leads`, `referral_leads`
- `showups`, `referral_showups`, `show_ups`
- `paid`, `referral_paid`, `converted`
- `achievement`, `achievement%`, `achievement_pct`

**Upgrade File**:
- `up_pct`, `up%`, `up`, `upgrade`

**All Leads File**:
- `total`, `total_leads`, `all_leads`
- `recovered`, `recovered_leads`
- `unrecovered`, `unrecovered_leads`
- `notes`, `unrecovered_notes`, `comments` (pipe or comma-separated)

## Percent Coercion

System safely converts:
- `0.8` → `80`
- `80` → `80`
- `"80%"` → `80`

Invalid values → `null` (logged as error).

## Google Sheets Integration

**Setup (API Key method)**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API
3. Create API Key (restrict to Sheets API)
4. Set `SHEETS_API_KEY` in env

**Setup (Service Account method)**:
1. Create service account in Google Cloud
2. Download JSON key
3. Share spreadsheet with service account email
4. Set `SHEETS_SERVICE_ACCOUNT_JSON` with full JSON string

**Usage**:
- Provide `spreadsheetId` (from URL: `https://docs.google.com/spreadsheets/d/{spreadsheetId}`)
- Provide `range` (e.g., `"Sheet1!A1:Z1000"`)

## Ingestion Flow

1. **Upload**: POST to `/api/ingestion/upload` (multipart/form-data) or `/api/ingestion/sheets` (JSON)
2. **Validation**: MIME, size, header checks
3. **Parsing**: Extract rows, map headers
4. **Normalization**: Convert percents, dedupe by `(agent_id, period)`
5. **Storage**: Upsert `MetricSnapshot` records
6. **Checksum**: Store checksum to detect duplicates
7. **Report**: Return `IngestionReport` with:
   - `recordsProcessed`, `recordsAccepted`, `recordsRejected`
   - `errors` array (row, field, reason)
   - `createdCount`, `updatedCount`

## Error Handling

**Accepted with warnings**: Missing optional fields (e.g., SC%, UP%)
**Rejected**: Missing required fields (`agent_id`, `team_name`), invalid types

All errors logged with row numbers for easy debugging.

## Deduplication

Rows with identical `(agent_id, period, weekOfMonth)` are upserted (last write wins).
Checksum prevents re-processing identical files.
