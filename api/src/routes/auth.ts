import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { signToken, EXPIRES } from '../jwt';
import { validate, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../validate';
import { sendPasswordReset } from '../email';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 5 });

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = $1 LIMIT 1',
      [String(email).trim()]
    );

    const raw = rows[0]?.password ?? '';
    const hash = raw.replace(/^\$2y\$/, '$2b$');
    if (!rows.length || !(await bcrypt.compare(String(password), hash))) {
      res.status(401).json({ error: 'Credenciales incorrectas' }); return;
    }

    const u = rows[0];

    // Migrate legacy PHP bcrypt hash ($2y$) to Node-compatible ($2b$) on login
    if (raw.startsWith('$2y$')) {
      const newHash = await bcrypt.hash(String(password), 10);
      await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [newHash, u.id]);
    }

    const token = signToken({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol });
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: EXPIRES * 1000,
    };
    res.cookie('token', token, cookieOpts);
    res.json({ success: true, data: { token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } } });
  } catch (e) {
    console.error('[auth] login error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [String(email).trim()]);
    if (existing.rows.length) {
      res.status(409).json({ error: 'El email ya está registrado' }); return;
    }

    const hash = await bcrypt.hash(String(password), 10);
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
      [String(nombre).trim(), String(email).trim(), hash, 'cliente']
    );
    res.status(201).json({ success: true, data: { mensaje: 'Usuario registrado correctamente' } });
  } catch (e) {
    console.error('[auth] register error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true });
});

const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/forgot-password', forgotLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1 LIMIT 1', [email]);

    // Always return 200 to prevent email enumeration
    res.json({ success: true, data: { mensaje: 'Si el email existe recibirás un enlace en breve.' } });

    if (!rows.length) return;

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [rows[0].id, token, expiresAt]
    );

    sendPasswordReset(email, token);
  } catch (e) {
    console.error('[auth] forgot-password error:', e);
  }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;

    const { rows } = await pool.query(
      'SELECT user_id FROM password_resets WHERE token = $1 AND used = 0 AND expires_at > NOW() LIMIT 1',
      [token]
    );
    if (!rows.length) { res.status(400).json({ error: 'Enlace inválido o expirado' }); return; }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE token = $1', [token]);

    res.json({ success: true, data: { mensaje: 'Contraseña actualizada correctamente' } });
  } catch (e) {
    console.error('[auth] reset-password error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
