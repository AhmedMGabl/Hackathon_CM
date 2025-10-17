import { Router } from 'express';
import healthRoutes from './health.js';
import ingestionRoutes from './ingestion.js';
import configRoutes from './config.js';
import mentorRoutes from './mentors.js';
import alertRoutes from './alerts.js';
// TODO PASS 2: Import remaining routes
// import authRoutes from './auth.js';
// import teamRoutes from './teams.js';
// import aiRoutes from './ai.js';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// Ingestion endpoints (auth required, handled in route file)
router.use('/api/ingestion', ingestionRoutes);

// Config endpoints (auth required, handled in route file)
router.use('/api/config', configRoutes);

// Mentor endpoints (auth required, handled in route file)
router.use('/api/mentors', mentorRoutes);

// Alert endpoints (auth required, handled in route file)
router.use('/api/alerts', alertRoutes);

// TODO PASS 2: Mount remaining authenticated routes
// router.use('/api/auth', authRoutes);
// router.use('/api/teams', teamRoutes);
// router.use('/api/ai', aiRoutes);

export default router;
