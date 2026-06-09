import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.price, p.discount_percent, p.discounted_price, p.team, p.year, p.league, p.image_url, p.category, p.sizes, p.is_new
     FROM wishlist w JOIN productos p ON p.id = w.product_id
     WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [req.user!.id]
  );

  const data = rows.map(row => ({
    id:              parseInt(row.id),
    name:            row.name,
    price:           parseFloat(row.price),
    discountPercent: parseFloat(row.discount_percent ?? 0),
    discountedPrice: row.discounted_price != null ? parseFloat(row.discounted_price) : null,
    team:            row.team,
    year:            parseInt(row.year),
    league:          row.league,
    imageUrl:        row.image_url,
    category:        row.category,
    sizes:           typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes ?? [],
    isNew:           Boolean(parseInt(row.is_new ?? 0)),
  }));

  res.json({ success: true, data });
});

router.post('/toggle', requireAuth, async (req, res) => {
  const { productId } = req.body ?? {};
  if (!productId) { res.status(400).json({ error: 'productId requerido' }); return; }

  const { rows } = await pool.query(
    'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
    [req.user!.id, parseInt(productId)]
  );

  if (rows.length) {
    await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.user!.id, parseInt(productId)]);
    res.json({ success: true, data: { action: 'removed' } });
  } else {
    await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)', [req.user!.id, parseInt(productId)]);
    res.json({ success: true, data: { action: 'added' } });
  }
});

export default router;
