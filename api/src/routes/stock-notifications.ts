import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/subscribe', async (req, res) => {
  try {
    const { email, productId, size } = req.body ?? {};
    if (!email || !productId || !size) { res.status(400).json({ error: 'email, productId y size requeridos' }); return; }
    await pool.query(
      'INSERT INTO stock_notifications (email, product_id, size) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [String(email).trim(), parseInt(productId), size]
    );
    res.json({ success: true, data: { mensaje: 'Te notificaremos cuando haya stock' } });
  } catch (e) {
    console.error('[stock-notifications] POST /subscribe error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/waitlist', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sn.product_id, p.name as product_name, p.image_url as "imageUrl", sn.size,
              COUNT(*) as waiting_count
       FROM stock_notifications sn JOIN productos p ON p.id = sn.product_id
       WHERE sn.sent = 0
       GROUP BY sn.product_id, p.name, p.image_url, sn.size
       ORDER BY waiting_count DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[stock-notifications] GET /waitlist error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/notify', requireAdmin, async (req, res) => {
  try {
    const { productId, size } = req.body ?? {};
    if (!productId || !size) { res.status(400).json({ error: 'productId y size requeridos' }); return; }
    const { rows } = await pool.query(
      'SELECT email FROM stock_notifications WHERE product_id = $1 AND size = $2 AND sent = 0',
      [parseInt(productId), size]
    );
    await pool.query(
      'UPDATE stock_notifications SET sent = 1, sent_at = NOW() WHERE product_id = $1 AND size = $2 AND sent = 0',
      [parseInt(productId), size]
    );
    res.json({ success: true, data: { notified: rows.length } });
  } catch (e) {
    console.error('[stock-notifications] POST /notify error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
