import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

// Create Express app
const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Mount routes
app.use(routes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
