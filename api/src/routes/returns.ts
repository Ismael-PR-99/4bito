import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { orderId, products, reason, description = '', photos = [], resolution = 'refund' } = req.body ?? {};
  if (!orderId || !products?.length || !reason) {
    res.status(400).json({ error: 'orderId, products y reason son obligatorios' }); return;
  }
  if (reason === 'Otro' && !description) {
    res.status(400).json({ error: 'La descripción es obligatoria cuando el motivo es "Otro"' }); return;
  }

  const { rows } = await pool.query(
    "SELECT id, fecha_creacion FROM pedidos WHERE id = $1 AND user_id = $2 AND estado = 'entregado'",
    [parseInt(orderId), req.user!.id]
  );
  if (!rows.length) { res.status(400).json({ error: 'Pedido no válido para devolución' }); return; }

  const daysDiff = (Date.now() - new Date(rows[0].fecha_creacion).getTime()) / 86400000;
  if (daysDiff > 30) { res.status(400).json({ error: 'Han pasado más de 30 días desde la entrega' }); return; }

  const existing = await pool.query(
    "SELECT id FROM returns_requests WHERE order_id = $1 AND status NOT IN ('rejected')",
    [parseInt(orderId)]
  );
  if (existing.rows.length) { res.status(400).json({ error: 'Ya existe una solicitud de devolución para este pedido' }); return; }

  const caseNumber = `RET-${Date.now()}`;
  const { rows: ins } = await pool.query(
    `INSERT INTO returns_requests (order_id, user_id, products_json, reason, description, photos_json, resolution, status, case_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) RETURNING id`,
    [parseInt(orderId), req.user!.id, JSON.stringify(products), reason, description, JSON.stringify(photos), resolution === 'exchange' ? 'exchange' : 'refund', caseNumber]
  );
  res.json({ success: true, data: { returnId: parseInt(ins[0].id), caseNumber, message: 'Solicitud enviada. Te contactaremos en 24-48h.' } });
});

router.get('/', requireAuth, async (req, res) => {
  const status = req.query.status as string | undefined;
  const isAdmin = req.user!.rol === 'admin';

  const params: any[] = [];
  const conditions: string[] = [];
  let i = 1;

  if (!isAdmin) { conditions.push(`user_id = $${i++}`); params.push(req.user!.id); }
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT r.*, u.nombre as user_name, u.email as user_email
     FROM returns_requests r LEFT JOIN usuarios u ON u.id = r.user_id
     ${where} ORDER BY r.created_at DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.nombre as user_name, u.email as user_email
     FROM returns_requests r LEFT JOIN usuarios u ON u.id = r.user_id WHERE r.id = $1`,
    [parseInt(req.params.id)]
  );
  if (!rows.length) { res.status(404).json({ error: 'Devolución no encontrada' }); return; }
  if (req.user!.rol !== 'admin' && rows[0].user_id !== req.user!.id) {
    res.status(403).json({ error: 'Acceso denegado' }); return;
  }
  res.json({ success: true, data: rows[0] });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { status, admin_notes = '' } = req.body ?? {};
  const valid = ['pending', 'approved', 'rejected', 'processing', 'completed', 'refunded', 'exchanged'];
  if (!valid.includes(status)) { res.status(400).json({ error: 'Status inválido' }); return; }
  await pool.query('UPDATE returns_requests SET status = $1, admin_notes = $2 WHERE id = $3', [status, admin_notes, parseInt(req.params.id)]);
  res.json({ success: true, data: { mensaje: 'Actualizado' } });
});

export default router;
