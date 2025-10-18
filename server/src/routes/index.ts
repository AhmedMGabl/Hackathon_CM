import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import uploadRoutes from './upload.js';
import ingestionRoutes from './ingestion.js';
import configRoutes from './config.js';
import mentorRoutes from './mentors.js';
import alertRoutes from './alerts.js';
import teamRoutes from './teams.js';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// Auth endpoints (no auth required for login)
router.use('/api/auth', authRoutes);

// Upload endpoints (SUPER_ADMIN only)
router.use('/api/upload', uploadRoutes);

// Ingestion endpoints (auth required, folder ingestion SUPER_ADMIN only)
router.use('/api/ingest', ingestionRoutes);
router.use('/api/ingestion', ingestionRoutes); // Alias for backwards compatibility

// Config endpoints (auth required, handled in route file)
router.use('/api/config', configRoutes);

// Mentor endpoints (auth required, handled in route file)
router.use('/api/mentors', mentorRoutes);

// Team endpoints
router.use('/api/teams', teamRoutes);

// Alert endpoints (auth required, handled in route file)
router.use('/api/alerts', alertRoutes);

export default router;
