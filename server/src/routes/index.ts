import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import uploadRoutes from './upload.js';
import configRoutes from './config.js';
import mentorRoutes from './mentors.js';
import alertRoutes from './alerts.js';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// Auth endpoints (no auth required for login)
router.use('/api/auth', authRoutes);

// Upload endpoints (SUPER_ADMIN only)
router.use('/api/upload', uploadRoutes);

// Config endpoints (auth required, handled in route file)
router.use('/api/config', configRoutes);

// Mentor endpoints (auth required, handled in route file)
router.use('/api/mentors', mentorRoutes);

// Alert endpoints (auth required, handled in route file)
router.use('/api/alerts', alertRoutes);

export default router;
