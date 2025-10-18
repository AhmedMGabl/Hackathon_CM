import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  ingestFromUpload,
  ingestFromGoogleSheets,
  getIngestionHistory,
  type ColumnMapping,
} from '../services/ingestion.service.js';
import { ingestFolder } from '../scripts/ingest-folder.js';
import { getRecentUploads, getUploadById } from '../etl/persistence.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requireSuperAdmin } from '../middleware/rbac.js';
import { env } from '../config/env.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: env.UPLOAD_DIR || './uploads',
  limits: { fileSize: (env.MAX_UPLOAD_MB || 200) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx?|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

// Zod schemas
const uploadMetaSchema = z.object({
  source: z.enum(['cc_file', 'fixed_file', 're_file', 'up_file', 'all_leads_file']),
  columnMapping: z.record(z.string()).optional(),
});

const sheetsIngestSchema = z.object({
  source: z.string().min(1),
  spreadsheetId: z.string().min(1),
  range: z.string().min(1),
  columnMapping: z.record(z.string()).optional(),
});

/**
 * POST /api/ingestion/upload
 * Upload Excel/CSV file for ingestion
 */
router.post(
  '/upload',
  authenticate,
  requireRole('ADMIN'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'No file uploaded',
          },
        });
      }

      // Parse and validate metadata
      const meta = uploadMetaSchema.safeParse({
        source: req.body.source,
        columnMapping: req.body.columnMapping ? JSON.parse(req.body.columnMapping) : undefined,
      });

      if (!meta.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request metadata',
            details: meta.error.errors,
          },
        });
      }

      const report = await ingestFromUpload(
        req.file,
        meta.data.source,
        req.user?.id,
        meta.data.columnMapping as ColumnMapping | undefined
      );

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ingestion/sheets
 * Ingest from Google Sheets
 */
router.post('/sheets', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const body = sheetsIngestSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.errors,
        },
      });
    }

    const report = await ingestFromGoogleSheets(
      body.data.spreadsheetId,
      body.data.range,
      body.data.source,
      req.user?.id,
      body.data.columnMapping as ColumnMapping | undefined
    );

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ingestion/history
 * Get ingestion upload history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getIngestionHistory(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ingest/folder
 * Trigger folder-based ingestion from ./Excel Sheets of What We Will Upload/
 * (SUPER_ADMIN only)
 */
router.post('/folder', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    console.log('📁 Folder ingestion triggered by:', req.user?.email);

    const report = await ingestFolder();

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Folder ingestion error:', error);
    next(error);
  }
});

/**
 * GET /api/ingest/reports
 * Get recent folder ingestion reports
 */
router.get('/reports', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const uploads = await getRecentUploads(limit);

    res.json({
      success: true,
      uploads
    });
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    next(error);
  }
});

/**
 * GET /api/ingest/reports/:id
 * Get specific ingestion report by ID
 */
router.get('/reports/:id', authenticate, async (req, res, next) => {
  try {
    const upload = await getUploadById(req.params.id);

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      upload
    });
  } catch (error) {
    console.error('Failed to fetch report:', error);
    next(error);
  }
});

export default router;
