import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env.js';
import { UPLOAD_LIMITS } from '../config/constants.js';
import { BadRequestError } from '../utils/errors.js';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

// File filter - validate MIME type and extension
function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (
    !(UPLOAD_LIMITS.ALLOWED_EXTENSIONS as readonly string[]).includes(ext) ||
    !(UPLOAD_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    cb(
      new BadRequestError(
        `Invalid file type. Allowed: ${UPLOAD_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`
      )
    );
  } else {
    cb(null, true);
  }
}

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// Multer configuration
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, // Convert MB to bytes
  },
});

// Named fields for multi-file upload
export const uploadFields = uploadMiddleware.fields([
  { name: 'cc_file', maxCount: 1 },
  { name: 'fixed_file', maxCount: 1 },
  { name: 're_file', maxCount: 1 },
  { name: 'up_file', maxCount: 1 },
  { name: 'all_leads_file', maxCount: 1 },
]);

/**
 * Clean up uploaded file
 */
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}
