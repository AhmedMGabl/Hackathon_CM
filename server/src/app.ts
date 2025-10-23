import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Security headers (configure for SPA)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In production on Railway, frontend and backend are same origin
      // Allow all origins if ALLOWED_ORIGINS is '*'
      if (env.ALLOWED_ORIGINS.includes('*')) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Reject origin
      callback(new Error('Not allowed by CORS'));
    },
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

// Serve static files from React build (in production)
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Mount API routes
app.use(routes);

// Serve React app for all non-API routes (must be after API routes)
// This enables client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
