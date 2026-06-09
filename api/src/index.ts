import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateEnv, runMigrations } from './startup';
import { logger } from './logger';
import { pool } from './db';

validateEnv();

import authRoutes           from './routes/auth';
import productsRoutes       from './routes/products';
import ordersRoutes         from './routes/orders';
import decadesRoutes        from './routes/decades';
import wishlistRoutes       from './routes/wishlist';
import reviewsRoutes        from './routes/reviews';
import adminRoutes          from './routes/admin';
import alertsRoutes         from './routes/alerts';
import chatRoutes           from './routes/chat';
import notificationsRoutes  from './routes/notifications';
import piezaSemanaRoutes    from './routes/pieza-semana';
import returnsRoutes        from './routes/returns';
import stockMovementsRoutes from './routes/stock-movements';
import stockNotifsRoutes    from './routes/stock-notifications';
import userRoutes           from './routes/user';
import discountsRoutes      from './routes/discounts';
import healthRoutes         from './routes/health';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3000');

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Espera 15 minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  skipSuccessfulRequests: true,
});

const discountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones.' },
});

app.use(globalLimiter);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? '../uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth',                authLimiter, authRoutes);
app.use('/api/products',            productsRoutes);
app.use('/api/orders',              ordersRoutes);
app.use('/api/decades',             decadesRoutes);
app.use('/api/wishlist',            wishlistRoutes);
app.use('/api/reviews',             reviewsRoutes);
app.use('/api/admin',               adminRoutes);
app.use('/api/alerts',              alertsRoutes);
app.use('/api/chat',                chatRoutes);
app.use('/api/notifications',       notificationsRoutes);
app.use('/api/pieza-semana',        piezaSemanaRoutes);
app.use('/api/returns',             returnsRoutes);
app.use('/api/stock-movements',     stockMovementsRoutes);
app.use('/api/stock-notifications', stockNotifsRoutes);
app.use('/api/user',                userRoutes);
app.use('/api/discounts',           discountLimiter, discountsRoutes);
app.use('/api/health',              healthRoutes);

// Serve Angular SPA in production (same-origin deployment)
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

const server = app.listen(PORT, async () => {
  await runMigrations().catch(e => logger.error('Migration failed', { error: String(e) }));
  logger.info('4BITO API started', { port: PORT, env: process.env.NODE_ENV ?? 'development' });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  // Force exit if graceful shutdown exceeds 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT',  () => { shutdown('SIGINT'); });
