import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { product_id, type, date_from, date_to, limit = '50', offset = '0' } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (product_id) { conditions.push(`product_id = $${i++}`); params.push(parseInt(product_id)); }
    if (type)       { conditions.push(`type = $${i++}`);       params.push(type); }
    if (date_from)  { conditions.push(`created_at >= $${i++}`); params.push(date_from); }
    if (date_to)    { conditions.push(`created_at <= $${i++}`); params.push(date_to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM stock_movements ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const { rows: cnt } = await pool.query(`SELECT COUNT(*) as total FROM stock_movements ${where}`, params);
    res.json({ success: true, data: { movements: rows, total: parseInt(cnt[0].total) } });
  } catch (e) {
    console.error('[stock-movements] GET / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { productId, productName, size, type, quantity, previousStock, newStock, reason = 'ajuste_manual', orderId = null, adminId = null } = req.body ?? {};
    const validTypes = ['entrada', 'salida', 'ajuste', 'devolucion'];
    if (!productId || !productName || !size || !validTypes.includes(type)) {
      res.status(400).json({ error: 'Datos inválidos' }); return;
    }
    const { rows } = await pool.query(
      `INSERT INTO stock_movements (product_id, product_name, size, type, quantity, previous_stock, new_stock, reason, order_id, admin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [parseInt(productId), productName, size, type, parseInt(quantity), parseInt(previousStock), parseInt(newStock), reason, orderId, adminId]
    );
    res.json({ success: true, id: parseInt(rows[0].id) });
  } catch (e) {
    console.error('[stock-movements] POST / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
