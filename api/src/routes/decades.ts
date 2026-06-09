import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT name FROM decades WHERE active = 1 ORDER BY name");
    res.json({ success: true, data: rows.map(r => r.name) });
  } catch (e) {
    console.error('[decades] GET / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
