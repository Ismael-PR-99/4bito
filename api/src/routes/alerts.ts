import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM stock_alerts WHERE ignored = 0 ORDER BY created_at DESC'
    );
    res.json({ success: true, data: { alerts: rows, total: rows.length } });
  } catch (e) {
    console.error('[alerts] GET / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/check', requireAdmin, async (req, res) => {
  try {
    const { productId, productName, size, currentStock, threshold = 3 } = req.body ?? {};
    if (!productId || !productName || !size) { res.status(400).json({ error: 'Datos inválidos' }); return; }

    const { rows } = await pool.query(
      'SELECT id FROM stock_alerts WHERE product_id = $1 AND size = $2 AND ignored = 0',
      [parseInt(productId), size]
    );

    if (rows.length) {
      await pool.query('UPDATE stock_alerts SET current_stock = $1 WHERE id = $2', [parseInt(currentStock), rows[0].id]);
    } else {
      await pool.query(
        'INSERT INTO stock_alerts (product_id, product_name, size, current_stock, threshold) VALUES ($1,$2,$3,$4,$5)',
        [parseInt(productId), productName, size, parseInt(currentStock), parseInt(threshold)]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[alerts] POST /check error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/ignore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body ?? {};
    if (!id) { res.status(400).json({ error: 'id requerido' }); return; }
    await pool.query('UPDATE stock_alerts SET ignored = 1 WHERE id = $1', [parseInt(id)]);
    res.json({ success: true });
  } catch (e) {
    console.error('[alerts] POST /ignore error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
