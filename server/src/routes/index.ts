import { Router } from 'express';
import healthRoutes from './health.js';
import ingestionRoutes from './ingestion.js';
import configRoutes from './config.js';
// TODO PASS 2: Import remaining routes
// import authRoutes from './auth.js';
// import mentorRoutes from './mentors.js';
// import teamRoutes from './teams.js';
// import alertRoutes from './alerts.js';
// import aiRoutes from './ai.js';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// Ingestion endpoints (auth required, handled in route file)
router.use('/api/ingestion', ingestionRoutes);

// Config endpoints (auth required, handled in route file)
router.use('/api/config', configRoutes);

// TODO PASS 2: Mount remaining authenticated routes
// router.use('/api/auth', authRoutes);
// router.use('/api/mentors', mentorRoutes);
// router.use('/api/teams', teamRoutes);
// router.use('/api/alerts', alertRoutes);
// router.use('/api/ai', aiRoutes);

export default router;
