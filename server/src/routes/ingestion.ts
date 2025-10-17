import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  ingestFromUpload,
  ingestFromGoogleSheets,
  getIngestionHistory,
  type ColumnMapping,
} from '../services/ingestion.service.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
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
  requireRole(['ADMIN']),
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
router.post('/sheets', authenticate, requireRole(['ADMIN']), async (req, res, next) => {
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

export default router;
