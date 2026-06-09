import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.*, p.name, p.price as original_price, p.image_url, p.team, p.year, p.league, p.category
       FROM pieza_semana ps JOIN productos p ON p.id = ps.product_id
       WHERE ps.is_active = 1 AND ps.valid_until > NOW() ORDER BY ps.created_at DESC LIMIT 1`
    );
    if (!rows.length) { res.json({ success: true, data: null }); return; }
    const r = rows[0];
    res.json({
      success: true,
      data: {
        id:              parseInt(r.id),
        productId:       parseInt(r.product_id),
        discountPercent: parseFloat(r.discount_percent),
        finalPrice:      parseFloat(r.final_price),
        validUntil:      r.valid_until,
        isActive:        Boolean(parseInt(r.is_active)),
        name:            r.name,
        originalPrice:   parseFloat(r.original_price),
        imageUrl:        r.image_url,
        team:            r.team,
        year:            parseInt(r.year),
        league:          r.league,
        category:        r.category,
      },
    });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { productId, discountPercent, finalPrice, validUntil } = req.body ?? {};
  if (!productId || !discountPercent || discountPercent > 90 || !finalPrice || !validUntil) {
    res.status(400).json({ error: 'productId, discountPercent (1-90), finalPrice y validUntil son obligatorios' }); return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE discount_percent > 0');
    await client.query('DELETE FROM pieza_semana');
    const { rows } = await client.query(
      'INSERT INTO pieza_semana (product_id, discount_percent, final_price, valid_until, is_active) VALUES ($1,$2,$3,$4,1) RETURNING id',
      [parseInt(productId), parseFloat(discountPercent), parseFloat(finalPrice), validUntil]
    );
    await client.query('UPDATE productos SET discounted_price = $1, discount_percent = $2 WHERE id = $3',
      [parseFloat(finalPrice), parseFloat(discountPercent), parseInt(productId)]);
    await client.query('COMMIT');
    res.json({ success: true, piezaId: parseInt(rows[0].id) });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

router.post('/deactivate', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE pieza_semana SET is_active = 0 WHERE is_active = 1 AND valid_until < NOW() RETURNING product_id"
    );
    if (rows.length) {
      await pool.query('UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE id = ANY($1)', [rows.map(r => r.product_id)]);
    }
    res.json({ success: true, data: { deactivated: rows.length } });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

export default router;
