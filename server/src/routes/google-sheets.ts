import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import sheetsService from '../services/sheets.service.js';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

// Validation schemas
const configSchema = z.object({
  apiKey: z.string().optional(),
  serviceAccountJson: z.string().optional(),
  spreadsheetId: z.string().optional(),
  ccRange: z.string().optional(),
  fixedRange: z.string().optional(),
  upgradeRange: z.string().optional(),
  referralRange: z.string().optional(),
  allLeadsRange: z.string().optional(),
  teamsRange: z.string().optional(),
  autoSync: z.boolean().optional(),
  syncIntervalHours: z.number().int().min(1).max(168).optional(),
});

const testConnectionSchema = z.object({
  apiKey: z.string().optional(),
  serviceAccountJson: z.string().optional(),
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
});

/**
 * GET /api/google-sheets/config
 * Get Google Sheets configuration
 */
router.get('/config', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const config = await prisma.googleSheetsConfig.findFirst({
      where: { teamId: null }, // Global config
    });

    // Don't expose full service account JSON in response
    if (config) {
      const safeConfig = {
        ...config,
        serviceAccountJson: config.serviceAccountJson ? '[REDACTED]' : null,
      };
      return res.json({ success: true, data: safeConfig });
    }

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/google-sheets/config
 * Save or update Google Sheets configuration
 */
router.post('/config', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid configuration',
          details: parsed.error.errors,
        },
      });
    }

    const data = parsed.data;

    // Find existing config or create new one
    const existing = await prisma.googleSheetsConfig.findFirst({
      where: { teamId: null },
    });

    let config;
    if (existing) {
      config = await prisma.googleSheetsConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      config = await prisma.googleSheetsConfig.create({
        data: {
          ...data,
          teamId: null,
        },
      });
    }

    // Redact sensitive data
    const safeConfig = {
      ...config,
      serviceAccountJson: config.serviceAccountJson ? '[REDACTED]' : null,
    };

    res.json({
      success: true,
      data: safeConfig,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/google-sheets/test-connection
 * Test Google Sheets connection with provided credentials
 */
router.post('/test-connection', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const parsed = testConnectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid test parameters',
          details: parsed.error.errors,
        },
      });
    }

    const { apiKey, serviceAccountJson, spreadsheetId } = parsed.data;

    // Temporarily set environment variables for testing
    const originalApiKey = process.env.SHEETS_API_KEY;
    const originalServiceAccount = process.env.SHEETS_SERVICE_ACCOUNT_JSON;

    try {
      if (apiKey) {
        process.env.SHEETS_API_KEY = apiKey;
      }
      if (serviceAccountJson) {
        process.env.SHEETS_SERVICE_ACCOUNT_JSON = serviceAccountJson;
      }

      // Recreate sheets service with new credentials
      const { google } = await import('googleapis');
      let sheets: any;

      if (apiKey) {
        sheets = google.sheets({ version: 'v4', auth: apiKey });
      } else if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const auth = new google.auth.JWT({
          email: serviceAccount.client_email,
          key: serviceAccount.private_key,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        sheets = google.sheets({ version: 'v4', auth });
      } else {
        throw new BadRequestError('Either apiKey or serviceAccountJson is required');
      }

      // Try to get spreadsheet metadata
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties(sheetId,title)',
      });

      res.json({
        success: true,
        data: {
          connected: true,
          spreadsheetTitle: response.data.properties?.title,
          sheets: response.data.sheets?.map((s: any) => s.properties.title) || [],
        },
        message: 'Connection successful',
      });
    } finally {
      // Restore original environment variables
      if (originalApiKey) {
        process.env.SHEETS_API_KEY = originalApiKey;
      } else {
        delete process.env.SHEETS_API_KEY;
      }
      if (originalServiceAccount) {
        process.env.SHEETS_SERVICE_ACCOUNT_JSON = originalServiceAccount;
      } else {
        delete process.env.SHEETS_SERVICE_ACCOUNT_JSON;
      }
    }
  } catch (error: any) {
    if (error.code === 403) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied. Make sure the sheet is shared publicly or with the service account.',
        },
      });
    } else if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Spreadsheet not found. Check the spreadsheet ID.',
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/google-sheets/sync
 * Manually trigger a sync from Google Sheets
 */
router.post('/sync', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const config = await prisma.googleSheetsConfig.findFirst({
      where: { teamId: null },
    });

    if (!config || !config.spreadsheetId) {
      return res.status(400).json({
        error: {
          code: 'NO_CONFIG',
          message: 'Google Sheets configuration not found. Please configure first.',
        },
      });
    }

    // Update last sync attempt
    await prisma.googleSheetsConfig.update({
      where: { id: config.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'in_progress',
      },
    });

    // TODO: Implement actual sync logic
    // For now, just return a success message
    res.json({
      success: true,
      message: 'Sync triggered successfully. This feature is coming soon.',
      data: {
        status: 'pending',
        configId: config.id,
      },
    });

    // Note: In production, this should be an async job
    // You would typically use a job queue like Bull or BullMQ
  } catch (error) {
    next(error);
  }
});

export default router;
