import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { env } from '../config/env.js';
import { autoTransform, type TransformResult } from '../etl/transformers.js';
import { mergeTransformResults, validateMergedData } from '../etl/merger.js';
import { persistMetrics, createUploadRecord } from '../etl/persistence.js';
import type { ColumnMapping } from '../etl/header-mapping.js';

const router = Router();

// Configure multer for in-memory uploads (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.MAX_UPLOAD_MB || 200) * 1024 * 1024,
    files: 5 // Max 5 files (one per source)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const allowedExtensions = /\.(xlsx?|xls)$/i;

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) files are allowed.'));
    }
  }
});

// Zod schema for column mapping presets
const columnMappingSchema = z.record(z.string()).optional();

/**
 * Ingestion Report structure (returned to client)
 */
export interface IngestionReport {
  timestamp: string;
  sources: Array<{
    source: string;
    files: string[];
    received: number;
    accepted: number;
    updated: number;
    skippedDuplicate: number;
    rejected: Array<{ file: string; row: number; reason: string }>;
    columnsDetected: string[];
    columnsMapped?: Record<string, string>;
  }>;
  totals: {
    filesProcessed: number;
    received: number;
    accepted: number;
    updated: number;
    created: number;
    skippedDuplicate: number;
    rejected: number;
  };
  coverage: {
    CC?: number;
    SC?: number;
    UP?: number;
    Fixed?: number;
    Referral?: number;
    Leads?: number;
  };
  mentorCount: number;
  teamCount: number;
  errors: string[];
  duration: number;
}

/**
 * POST /api/ingest/uploads
 * Upload Excel files for ingestion (Admin only)
 * Accepts multipart/form-data with fields: cc_file, fixed_file, re_file, up_file, all_leads_file
 */
router.post(
  '/uploads',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  upload.fields([
    { name: 'cc_file', maxCount: 1 },
    { name: 'fixed_file', maxCount: 1 },
    { name: 're_file', maxCount: 1 },
    { name: 'up_file', maxCount: 1 },
    { name: 'all_leads_file', maxCount: 1 }
  ]),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'No files uploaded. Please select at least one Excel file.'
          }
        });
      }

      // Parse column mappings from request body (if provided)
      const columnMappings: Record<string, ColumnMapping> = {};
      for (const source of ['cc_file', 'fixed_file', 're_file', 'up_file', 'all_leads_file']) {
        const mappingStr = req.body[`${source}_mapping`];
        if (mappingStr) {
          try {
            const parsed = columnMappingSchema.safeParse(JSON.parse(mappingStr));
            if (parsed.success && parsed.data) {
              columnMappings[source] = parsed.data;
            }
          } catch (error) {
            console.warn(`Invalid column mapping for ${source}:`, error);
          }
        }
      }

      const transformResults: TransformResult[] = [];
      const errors: string[] = [];

      // Process each uploaded file
      for (const [fieldname, fileArray] of Object.entries(files)) {
        if (!fileArray || fileArray.length === 0) continue;

        const file = fileArray[0];
        console.log(`Processing upload: ${file.originalname} (${fieldname})`);

        try {
          // Parse Excel from buffer
          const workbook = XLSX.read(file.buffer, { type: 'buffer' });

          // Get column mapping preset for this source (if any)
          const presetMapping = columnMappings[fieldname];

          // Transform using existing ETL pipeline
          const result = autoTransform(workbook, file.originalname, presetMapping);

          if (result) {
            transformResults.push(result);
            console.log(`  ✓ Detected: ${result.source}, ${result.accepted.length} rows accepted, ${result.rejected.length} rejected`);
          } else {
            const errorMsg = `Unable to detect source type for ${file.originalname}`;
            errors.push(errorMsg);
            console.warn(`  ✗ ${errorMsg}`);
          }
        } catch (error) {
          const errorMsg = `Failed to process ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`  ✗ ${errorMsg}`);
        }
      }

      if (transformResults.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: 'No files were successfully processed',
            details: errors
          }
        });
      }

      // Merge multi-source data
      console.log('🔄 Merging multi-source data...');
      const mergeResult = mergeTransformResults(transformResults);
      console.log(`  ✓ Merged ${mergeResult.merged.length} metric records for ${mergeResult.mentorCount} mentors`);

      // Validate merged data
      console.log('✓ Validating merged data...');
      const { valid, invalid } = validateMergedData(mergeResult.merged);

      if (invalid.length > 0) {
        console.log(`  ⚠️  ${invalid.length} invalid records (will be skipped)`);
        invalid.forEach(({ mentor, reason }) => {
          errors.push(`Invalid data for ${mentor}: ${reason}`);
        });
      }

      console.log(`  ✓ ${valid.length} valid records ready for persistence`);

      // Create upload audit record
      const uploadId = await createUploadRecord({
        source: 'web_upload',
        sourceDetail: Object.keys(files).join(', '),
        createdBy: req.user?.id,
        status: 'SUCCESS',
        recordsProcessed: mergeResult.merged.length,
        recordsAccepted: valid.length,
        recordsRejected: invalid.length,
        recordsUpdated: 0,
        recordsCreated: 0,
        meta: {
          files: Object.values(files).flat().map(f => f.originalname),
          sources: transformResults.map(r => r.source),
          columnMappings
        },
        errors: errors.map(e => ({ message: e }))
      });

      // Persist to database
      console.log('💾 Persisting to database...');
      const persistResult = await persistMetrics(valid, uploadId);

      console.log(`  ✓ Created: ${persistResult.created}`);
      console.log(`  ✓ Updated: ${persistResult.updated}`);
      console.log(`  ✓ Skipped (duplicate): ${persistResult.skippedDuplicate}`);

      if (persistResult.errors.length > 0) {
        console.log(`  ⚠️  Errors: ${persistResult.errors.length}`);
        persistResult.errors.forEach(({ mentor, reason }) => {
          errors.push(`Persistence error for ${mentor}: ${reason}`);
        });
      }

      // Update upload record with final counts
      await createUploadRecord({
        source: 'web_upload',
        sourceDetail: Object.keys(files).join(', '),
        createdBy: req.user?.id,
        status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        recordsProcessed: mergeResult.merged.length,
        recordsAccepted: valid.length,
        recordsRejected: invalid.length + persistResult.errors.length,
        recordsUpdated: persistResult.updated,
        recordsCreated: persistResult.created,
        meta: {
          files: Object.values(files).flat().map(f => f.originalname),
          sources: transformResults.map(r => r.source),
          coverage: mergeResult.coverage,
          columnMappings
        },
        errors: errors.map(e => ({ message: e }))
      });

      // Build response report
      const report: IngestionReport = {
        timestamp: new Date().toISOString(),
        sources: transformResults.map(r => ({
          source: r.source,
          files: [r.file],
          received: r.received,
          accepted: r.accepted.length,
          updated: 0,
          skippedDuplicate: 0,
          rejected: r.rejected.map(rej => ({
            file: r.file,
            row: rej.row,
            reason: rej.reason
          })),
          columnsDetected: r.columnsDetected,
          columnsMapped: r.columnsMapped
        })),
        totals: {
          filesProcessed: Object.keys(files).length,
          received: transformResults.reduce((sum, r) => sum + r.received, 0),
          accepted: valid.length,
          updated: persistResult.updated,
          created: persistResult.created,
          skippedDuplicate: persistResult.skippedDuplicate,
          rejected: invalid.length + persistResult.errors.length
        },
        coverage: mergeResult.coverage,
        mentorCount: mergeResult.mentorCount,
        teamCount: mergeResult.teamMapping.size,
        errors,
        duration: Date.now() - startTime
      };

      console.log(`✅ Upload ingestion complete in ${(report.duration / 1000).toFixed(2)}s`);

      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Upload ingestion error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Upload processing failed',
          details: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
);

export default router;
