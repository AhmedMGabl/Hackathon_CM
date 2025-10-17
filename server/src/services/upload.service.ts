import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { UPLOAD_LIMITS } from '../config/constants.js';
import { BadRequestError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { parseClassConsumption } from './parsers/cc-parser.js';
import { parseFixedRate } from './parsers/fixed-parser.js';
import { parseUpgradeRate } from './parsers/upgrade-parser.js';
import { parseLeads } from './parsers/leads-parser.js';
import { parseTeams } from './parsers/teams-parser.js';

export type UploadSource = 'cc_file' | 'fixed_file' | 'upgrade_file' | 'leads_file' | 'teams_file';

export interface UploadResult {
  uploadId: string;
  source: UploadSource;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  processed: number;
  created: number;
  updated: number;
  errors: any[];
  message: string;
}

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
  { name: 'upgrade_file', maxCount: 1 },
  { name: 'leads_file', maxCount: 1 },
  { name: 'teams_file', maxCount: 1 },
]);

/**
 * Process uploaded file and import data
 */
export async function processUpload(
  filePath: string,
  source: UploadSource,
  createdBy: string
): Promise<UploadResult> {
  logger.info('Processing upload', { filePath, source, createdBy });

  try {
    // Calculate file checksum
    const fileBuffer = fsSync.readFileSync(filePath);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Check for duplicate upload
    const existingUpload = await prisma.upload.findFirst({
      where: {
        source,
        checksum,
        status: 'SUCCESS',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (existingUpload) {
      logger.warn('Duplicate upload detected', { checksum, existingUpload: existingUpload.id });
      return {
        uploadId: existingUpload.id,
        source,
        status: 'FAILED',
        processed: 0,
        created: 0,
        updated: 0,
        errors: [{ message: 'This file was already uploaded in the last 24 hours' }],
        message: 'Duplicate upload detected',
      };
    }

    // Parse file based on source
    let parseResult: any;
    switch (source) {
      case 'cc_file':
        parseResult = await parseClassConsumption(filePath);
        break;
      case 'fixed_file':
        parseResult = await parseFixedRate(filePath);
        break;
      case 'upgrade_file':
        parseResult = await parseUpgradeRate(filePath);
        break;
      case 'leads_file':
        parseResult = await parseLeads(filePath);
        break;
      case 'teams_file':
        parseResult = await parseTeams(filePath);
        break;
      default:
        throw new Error(`Unknown upload source: ${source}`);
    }

    // Determine status
    let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
    if (parseResult.errors && parseResult.errors.length > 0) {
      status = parseResult.processed > 0 ? 'PARTIAL' : 'FAILED';
    }

    // Create Upload record
    const upload = await prisma.upload.create({
      data: {
        source,
        sourceDetail: filePath.split(/[/\\]/).pop() || 'unknown',
        checksum,
        createdBy,
        status,
        recordsProcessed: parseResult.processed || 0,
        recordsAccepted: parseResult.processed || 0,
        recordsRejected: parseResult.errors?.length || 0,
        recordsUpdated: parseResult.updated || 0,
        recordsCreated: parseResult.created || parseResult.studentsCreated || parseResult.teamsCreated || 0,
        errors: parseResult.errors && parseResult.errors.length > 0
          ? parseResult.errors.slice(0, 100) // Limit to first 100 errors
          : null,
      },
    });

    // Calculate mentor scores after upload
    await calculateMentorScores();

    logger.info('Upload complete', {
      uploadId: upload.id,
      status,
      processed: parseResult.processed,
    });

    return {
      uploadId: upload.id,
      source,
      status,
      processed: parseResult.processed || 0,
      created: parseResult.created || parseResult.studentsCreated || parseResult.teamsCreated || 0,
      updated: parseResult.updated || parseResult.mentorsUpdated || 0,
      errors: parseResult.errors || [],
      message: status === 'SUCCESS'
        ? 'Upload successful'
        : status === 'PARTIAL'
        ? 'Upload completed with some errors'
        : 'Upload failed',
    };
  } catch (error: any) {
    logger.error('Upload processing failed', { error: error.message, stack: error.stack });

    // Create failed Upload record
    const upload = await prisma.upload.create({
      data: {
        source,
        sourceDetail: filePath.split(/[/\\]/).pop() || 'unknown',
        createdBy,
        status: 'FAILED',
        recordsProcessed: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        errors: [{ message: error.message, stack: error.stack }],
      },
    });

    return {
      uploadId: upload.id,
      source,
      status: 'FAILED',
      processed: 0,
      created: 0,
      updated: 0,
      errors: [{ message: error.message }],
      message: 'Upload failed',
    };
  }
}

/**
 * Calculate weighted score and status for all mentors
 */
export async function calculateMentorScores(periodDate?: Date) {
  const date = periodDate || new Date();
  date.setHours(0, 0, 0, 0);

  logger.info('Calculating mentor scores', { periodDate: date });

  const stats = await prisma.mentorStats.findMany({
    where: { periodDate: date },
  });

  // Get config
  const config = await prisma.config.findFirst({
    where: { teamId: null }, // Global config
  });

  const ccTarget = config?.ccTarget || 80;
  const scTarget = config?.scTarget || 15;
  const upTarget = config?.upTarget || 25;
  const fixedTarget = config?.fixedTarget || 60;
  const ccWeight = config?.ccWeight || 25;
  const scWeight = config?.scWeight || 25;
  const upWeight = config?.upWeight || 25;
  const fixedWeight = config?.fixedWeight || 25;

  for (const stat of stats) {
    const ccScore = clamp((stat.avgClassConsumption / ccTarget) * 100, 0, 150);
    const scScore = clamp((stat.superClassPct / scTarget) * 100, 0, 150);
    const upScore = clamp((stat.upgradeRatePct / upTarget) * 100, 0, 150);
    const fixedScore = clamp((stat.fixedRatePct / fixedTarget) * 100, 0, 150);

    const weightedScore = (
      (ccScore * ccWeight / 100) +
      (scScore * scWeight / 100) +
      (upScore * upWeight / 100) +
      (fixedScore * fixedWeight / 100)
    ) / 4;

    const targetsHit =
      (stat.avgClassConsumption >= ccTarget ? 1 : 0) +
      (stat.superClassPct >= scTarget ? 1 : 0) +
      (stat.upgradeRatePct >= upTarget ? 1 : 0) +
      (stat.fixedRatePct >= fixedTarget ? 1 : 0);

    const status = weightedScore >= 100 ? 'ABOVE' : weightedScore >= 90 ? 'WARNING' : 'BELOW';

    await prisma.mentorStats.update({
      where: { id: stat.id },
      data: { weightedScore, targetsHit, status },
    });
  }

  // Calculate ranks within each team
  const teams = await prisma.team.findMany();
  for (const team of teams) {
    const teamStats = await prisma.mentorStats.findMany({
      where: {
        periodDate: date,
        mentor: { teamId: team.id },
      },
      orderBy: { weightedScore: 'desc' },
    });

    for (let i = 0; i < teamStats.length; i++) {
      await prisma.mentorStats.update({
        where: { id: teamStats[i].id },
        data: { rank: i + 1 },
      });
    }
  }

  logger.info('Mentor scores calculated', { count: stats.length });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
