/**
 * ETL Cleaning and Normalization Utilities
 * Robust data cleaning for ingestion from Excel/Sheets
 */

/**
 * Clean numeric value: strip symbols, handle various formats
 * Accepts: 0.8, 80, "80%", "> 85", "≥ 90%", "1,234.56"
 * Returns: number or null
 */
export function cleanNumericValue(value: any): number | null {
  if (value == null || value === '') return null;

  // Already a valid number
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  // Convert to string and clean
  let str = String(value).trim();

  // Remove comparison symbols and other noise
  str = str.replace(/[><≥≤%\s,]/g, '');

  // Replace common decimal separators
  str = str.replace(/,/g, '.');

  const num = parseFloat(str);

  return isNaN(num) ? null : num;
}

/**
 * Clean percentage value with smart detection
 * Auto-detects if value is already percentage (80) or decimal (0.8)
 * Always returns 0-100 scale
 */
export function cleanPercentValue(value: any): number | null {
  const cleaned = cleanNumericValue(value);
  if (cleaned === null) return null;

  // If value is between 0-1 (exclusive), assume it's decimal form (0.8 → 80)
  if (cleaned > 0 && cleaned < 1) {
    return cleaned * 100;
  }

  // If value is ≤ 2 (e.g., 0.15, 1.5), treat as decimal (but only if original had decimal point)
  const strValue = String(value).trim();
  if (cleaned <= 2 && strValue.includes('.') && !strValue.includes('%')) {
    return cleaned * 100;
  }

  // Otherwise assume already percentage scale
  return cleaned;
}

/**
 * Normalize mentor/agent name for matching
 * - Uppercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove special characters except spaces and hyphens
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .replace(/[^\w\s-]/g, '');  // Keep only alphanumeric, spaces, hyphens
}

/**
 * Normalize team name (same as mentor name)
 */
export function normalizeTeamName(team: string | null | undefined): string {
  return normalizeName(team);
}

/**
 * Parse date from various formats
 * Handles: ISO strings, Excel serial dates, Date objects, timestamps
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Excel serial date number (days since 1900-01-01)
  if (typeof value === 'number' && value > 25000 && value < 60000) {
    const excelEpoch = new Date(1900, 0, 1);
    const days = Math.floor(value) - 2; // Excel has a leap year bug
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try parsing as string
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculate week of month (1-4) from date
 */
export function getWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  return Math.min(Math.ceil(dayOfMonth / 7), 4);
}

/**
 * Parse integer value
 */
export function cleanIntValue(value: any): number | null {
  const cleaned = cleanNumericValue(value);
  return cleaned !== null ? Math.round(cleaned) : null;
}

/**
 * Parse and split pipe or comma-separated notes
 */
export function parseNotes(value: any): string[] {
  if (!value) return [];

  const str = String(value).trim();
  if (!str) return [];

  // Split by pipe or comma
  const delimiter = str.includes('|') ? '|' : ',';
  return str
    .split(delimiter)
    .map(note => note.trim())
    .filter(note => note.length > 0);
}

/**
 * Clean header name for matching
 * - Lowercase
 * - Replace spaces/underscores with single underscore
 * - Remove special characters
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '_')
    .replace(/[^\w]/g, '');
}

/**
 * Generate checksum for deduplication
 * Based on mentor ID and period date
 */
export function generateChecksum(mentorId: string, periodDate: Date): string {
  const dateStr = periodDate.toISOString().split('T')[0];
  const content = `${mentorId}:${dateStr}`;

  // Simple hash (replace with crypto in production)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}
