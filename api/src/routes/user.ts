import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/sizes', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT size_camisetas, size_chaquetas, size_pantalones FROM user_sizes WHERE user_id = $1',
      [req.user!.id]
    );
    const data = rows[0] ?? { size_camisetas: null, size_chaquetas: null, size_pantalones: null };
    res.json({ success: true, data: { camisetas: data.size_camisetas, chaquetas: data.size_chaquetas, pantalones: data.size_pantalones } });
  } catch (e) {
    console.error('[user] GET /sizes error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/sizes', requireAuth, async (req, res) => {
  try {
    const { camisetas, chaquetas, pantalones } = req.body ?? {};
    await pool.query(
      `INSERT INTO user_sizes (user_id, size_camisetas, size_chaquetas, size_pantalones)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET size_camisetas=$2, size_chaquetas=$3, size_pantalones=$4, updated_at=NOW()`,
      [req.user!.id, camisetas ?? null, chaquetas ?? null, pantalones ?? null]
    );
    res.json({ success: true, data: { mensaje: 'Tallas guardadas' } });
  } catch (e) {
    console.error('[user] POST /sizes error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
