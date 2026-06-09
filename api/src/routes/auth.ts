import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { signToken, EXPIRES } from '../jwt';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 5 });

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son obligatorios' }); return;
    }

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

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body ?? {};
    if (!nombre || !email || !password) {
      res.status(400).json({ error: 'Todos los campos son obligatorios' }); return;
    }

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

export default router;
