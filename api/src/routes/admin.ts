import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/metrics', requireAdmin, async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) as total FROM productos');

  const dayQuery = `SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as ingresos
                    FROM pedidos WHERE estado != 'cancelado' AND DATE(fecha_creacion) = $1`;
  const pendingQuery = `SELECT COUNT(*) as cnt FROM pedidos WHERE estado IN ('procesando','enviado') AND DATE(fecha_creacion) = $1`;

  const [todayR, yesterdayR, pendTodayR, pendYestR] = await Promise.all([
    pool.query(dayQuery, [today]),
    pool.query(dayQuery, [yesterday]),
    pool.query(pendingQuery, [today]),
    pool.query(pendingQuery, [yesterday]),
  ]);

  res.json({
    success: true,
    data: {
      totalProductos:         parseInt(total),
      vendidosHoy:            parseInt(todayR.rows[0].cnt),
      vendidosAyer:           parseInt(yesterdayR.rows[0].cnt),
      ingresosHoy:            parseFloat(todayR.rows[0].ingresos),
      ingresosAyer:           parseFloat(yesterdayR.rows[0].ingresos),
      pedidosPendientes:      parseInt(pendTodayR.rows[0].cnt),
      pedidosPendientesAyer:  parseInt(pendYestR.rows[0].cnt),
    },
  });
});

export default router;
