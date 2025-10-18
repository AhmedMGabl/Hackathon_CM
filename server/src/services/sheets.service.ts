import { google } from 'googleapis';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Google Sheets service
 * Handles fetching data from Google Sheets
 */
class SheetsService {
  private sheets: any;

  constructor() {
    // Initialize Google Sheets API client
    // TODO PASS 3: Complete initialization based on env config
    if (env.SHEETS_API_KEY) {
      // API Key method (simpler, read-only)
      this.sheets = google.sheets({ version: 'v4', auth: env.SHEETS_API_KEY });
    } else if (env.SHEETS_SERVICE_ACCOUNT_JSON) {
      // Service Account method (full access)
      const serviceAccount = JSON.parse(env.SHEETS_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      this.sheets = google.sheets({ version: 'v4', auth });
    }
  }

  /**
   * Fetch data from a Google Sheet
   * @param spreadsheetId - The Google Sheets ID
   * @param range - The range to fetch (e.g., "Sheet1!A1:Z1000")
   * @returns Raw data as 2D array
   */
  async fetchSheet(spreadsheetId: string, range: string): Promise<any[][]> {
    if (!this.sheets) {
      throw new BadRequestError('Google Sheets API not configured. Please set SHEETS_API_KEY or SHEETS_SERVICE_ACCOUNT_JSON in your environment.');
    }

    logger.info('Fetching Google Sheet', { spreadsheetId, range });

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const data = response.data.values || [];
      logger.info('Google Sheet fetched successfully', {
        spreadsheetId,
        range,
        rows: data.length
      });

      return data;
    } catch (error: any) {
      logger.error('Failed to fetch Google Sheet', {
        error: error.message,
        spreadsheetId,
        range
      });

      if (error.code === 403) {
        throw new BadRequestError('Access denied. Make sure the Google Sheet is shared with "Anyone with the link can view" or shared with the service account.');
      } else if (error.code === 404) {
        throw new BadRequestError('Spreadsheet not found. Check the spreadsheet ID.');
      }

      throw new BadRequestError(`Failed to fetch Google Sheet: ${error.message}`);
    }
  }

  /**
   * Validate spreadsheet exists and is accessible
   */
  async validateSpreadsheet(spreadsheetId: string): Promise<boolean> {
    if (!this.sheets) {
      return false;
    }

    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId,
      });
      return true;
    } catch (error) {
      logger.error('Spreadsheet validation failed', { error, spreadsheetId });
      return false;
    }
  }
}

export default new SheetsService();
