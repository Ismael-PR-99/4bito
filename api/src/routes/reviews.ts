import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/reviews?product_id=X
router.get('/', async (req, res) => {
  try {
    const productId = parseInt(req.query.product_id as string ?? '0');
    if (!productId) { res.status(400).json({ error: 'product_id requerido' }); return; }

    const { rows } = await pool.query(
      `SELECT * FROM reviews WHERE product_id = $1 AND approved = 1 ORDER BY created_at DESC`,
      [productId]
    );

    const avg = rows.length ? rows.reduce((s, r) => s + parseInt(r.rating), 0) / rows.length : 0;
    res.json({ success: true, data: { reviews: rows, avg_rating: Math.round(avg * 10) / 10, total: rows.length } });
  } catch (e) {
    console.error('[reviews] GET / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reviews/moderate (admin)
router.get('/moderate', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status as string;
    const where = status === 'pending' ? 'WHERE approved = 0' : '';
    const { rows } = await pool.query(`SELECT * FROM reviews ${where} ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[reviews] GET /moderate error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/reviews (auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body ?? {};
    if (!productId || !rating || !comment) { res.status(400).json({ error: 'productId, rating y comment son obligatorios' }); return; }
    if (rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating entre 1 y 5' }); return; }

    const existing = await pool.query('SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2', [req.user!.id, productId]);
    if (existing.rows.length) { res.status(409).json({ error: 'Ya has valorado este producto' }); return; }

    await pool.query(
      `INSERT INTO reviews (product_id, user_id, user_name, rating, comment, verified, approved)
       VALUES ($1,$2,$3,$4,$5,0,0)`,
      [parseInt(productId), req.user!.id, req.user!.nombre, parseInt(rating), String(comment).trim()]
    );
    res.status(201).json({ success: true, data: { mensaje: 'Valoración enviada, pendiente de aprobación' } });
  } catch (e) {
    console.error('[reviews] POST / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/reviews/moderate (admin)
router.post('/moderate', requireAdmin, async (req, res) => {
  try {
    const { id, action } = req.body ?? {};
    if (!id || !['approve', 'delete'].includes(action)) { res.status(400).json({ error: 'id y action (approve|delete) requeridos' }); return; }

    if (action === 'approve') {
      await pool.query('UPDATE reviews SET approved = 1 WHERE id = $1', [parseInt(id)]);

      const { rows } = await pool.query('SELECT product_id FROM reviews WHERE id = $1', [parseInt(id)]);
      if (rows.length) {
        const { rows: avg } = await pool.query(
          'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = $1 AND approved = 1',
          [rows[0].product_id]
        );
        await pool.query('UPDATE productos SET rating_avg = $1, rating_count = $2 WHERE id = $3',
          [parseFloat(avg[0].avg ?? 0), parseInt(avg[0].cnt), rows[0].product_id]);
      }
    } else {
      await pool.query('DELETE FROM reviews WHERE id = $1', [parseInt(id)]);
    }

    res.json({ success: true, data: { mensaje: 'OK' } });
  } catch (e) {
    console.error('[reviews] POST /moderate error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
