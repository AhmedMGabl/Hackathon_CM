import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { uploadFields, processUpload, cleanupFile } from '../services/upload.service.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/upload
 * Upload Excel files (SUPER_ADMIN only)
 * Supports 5 file types: cc_file, fixed_file, upgrade_file, leads_file, teams_file
 */
router.post('/upload', authenticate, uploadFields, async (req, res, next) => {
  try {
    // Check if user is SUPER_ADMIN
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only Super Admins can upload files',
        },
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No files uploaded',
        },
      });
    }

    const results = [];

    // Process each uploaded file
    for (const [source, fileArray] of Object.entries(files)) {
      const file = fileArray[0];
      if (!file) continue;

      try {
        const result = await processUpload(
          file.path,
          source as any,
          req.user.id
        );

        results.push(result);

        // Clean up file after processing
        await cleanupFile(file.path);
      } catch (error: any) {
        results.push({
          uploadId: 'none',
          source,
          status: 'FAILED',
          processed: 0,
          created: 0,
          updated: 0,
          errors: [{ message: error.message }],
          message: 'Upload failed',
        });

        // Clean up file even on error
        try {
          await cleanupFile(file.path);
        } catch {}
      }
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/upload/history
 * Get upload history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    // Super Admins see all, others see their own
    const where = req.user?.role === 'SUPER_ADMIN'
      ? {}
      : { createdBy: req.user?.id };

    const uploads = await prisma.upload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: uploads,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/upload/:id
 * Get single upload details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const upload = await prisma.upload.findUnique({
      where: { id: req.params.id },
    });

    if (!upload) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Upload not found',
        },
      });
    }

    // Non-super-admins can only see their own uploads
    if (req.user?.role !== 'SUPER_ADMIN' && upload.createdBy !== req.user?.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
