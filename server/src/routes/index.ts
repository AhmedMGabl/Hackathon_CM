import { Router } from 'express';
import healthRoutes from './health.js';
// TODO PASS 2: Import remaining routes
// import authRoutes from './auth';
// import ingestionRoutes from './ingestion';
// import agentRoutes from './agents';
// import teamRoutes from './teams';
// import targetRoutes from './targets';
// import alertRoutes from './alerts';
// import aiRoutes from './ai';

const router = Router();

// Health check (no auth required)
router.use(healthRoutes);

// TODO PASS 2: Mount authenticated routes
// router.use('/api/auth', authRoutes);
// router.use('/api/ingestion', authenticate, ingestionRoutes);
// router.use('/api/agents', authenticate, agentRoutes);
// router.use('/api/teams', authenticate, teamRoutes);
// router.use('/api/targets', authenticate, targetRoutes);
// router.use('/api/alerts', authenticate, alertRoutes);
// router.use('/api/ai', authenticate, aiRoutes);

export default router;
