import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query("SELECT name FROM decades WHERE active = 1 ORDER BY name");
  res.json({ success: true, data: rows.map(r => r.name) });
});

export default router;
