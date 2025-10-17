import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import ingestionRoutes from './ingestion.js';
import configRoutes from './config.js';
import mentorRoutes from './mentors.js';
import alertRoutes from './alerts.js';
// TODO: Import remaining routes
// import teamRoutes from './teams.js';
// import aiRoutes from './ai.js';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// Auth endpoints (no auth required for login)
router.use('/api/auth', authRoutes);

// Ingestion endpoints (auth required, handled in route file)
router.use('/api/ingestion', ingestionRoutes);

// Config endpoints (auth required, handled in route file)
router.use('/api/config', configRoutes);

// Mentor endpoints (auth required, handled in route file)
router.use('/api/mentors', mentorRoutes);

// Alert endpoints (auth required, handled in route file)
router.use('/api/alerts', alertRoutes);

// TODO: Mount remaining authenticated routes
// router.use('/api/teams', teamRoutes);
// router.use('/api/ai', aiRoutes);

export default router;
