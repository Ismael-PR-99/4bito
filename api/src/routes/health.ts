import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT version()');
    res.json({
      status: 'ok',
      db:     'ok',
      pg:     rows[0].version.split(' ').slice(0, 2).join(' '),
      uptime: Math.floor(process.uptime()),
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

export default router;
