import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { artistRoutes } from './routes/artists';
import { releaseRoutes } from './routes/releases';
import { trackRoutes } from './routes/tracks';
import { reviewRoutes } from './routes/reviews';
import { ratingRoutes } from './routes/ratings';
import { diaryRoutes } from './routes/diary';
import { listRoutes } from './routes/lists';
import { chartRoutes } from './routes/charts';
import { searchRoutes } from './routes/search';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TRUST_PROXY = process.env.TRUST_PROXY || '1';
app.set('trust proxy', TRUST_PROXY === 'true' ? 1 : TRUST_PROXY === 'false' ? false : TRUST_PROXY);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 25),
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.WRITE_RATE_LIMIT_MAX || 120),
  message: 'Too many write requests from this IP, please slow down and try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const unsafeMethodWriteLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  writeLimiter(req, res, next);
};

// CORS configuration
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL);
}

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => allowedOrigins.add(origin));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const duration = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', unsafeMethodWriteLimiter, userRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/releases', unsafeMethodWriteLimiter, releaseRoutes);
app.use('/api/tracks', unsafeMethodWriteLimiter, trackRoutes);
app.use('/api/reviews', unsafeMethodWriteLimiter, reviewRoutes);
app.use('/api/ratings', unsafeMethodWriteLimiter, ratingRoutes);
app.use('/api/diary', unsafeMethodWriteLimiter, diaryRoutes);
app.use('/api/lists', unsafeMethodWriteLimiter, listRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

export default app;
