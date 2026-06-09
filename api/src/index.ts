import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

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

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3000');

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? '../uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth',                authRoutes);
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
app.use('/api/discounts',           discountsRoutes);

app.listen(PORT, () => console.log(`4BITO API running on http://localhost:${PORT}`));
