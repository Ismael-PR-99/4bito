import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();
const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });

function mapPedido(row: any) {
  return {
    id:                   parseInt(row.id),
    clienteNombre:        row.nombre_cliente,
    clienteEmail:         row.email,
    telefono:             row.telefono,
    direccion:            row.direccion,
    ciudad:               row.ciudad,
    cp:                   row.cp,
    pais:                 row.pais,
    productos:            typeof row.productos_json === 'string' ? JSON.parse(row.productos_json) : row.productos_json ?? [],
    total:                parseFloat(row.total),
    estado:               row.estado,
    fechaCreacion:        row.fecha_creacion,
    paypalTransactionId:  row.paypal_transaction_id ?? null,
    historialEstados:     row.historial ?? [],
  };
}

// POST /api/orders
router.post('/', orderLimiter, optionalAuth, async (req, res) => {
  const body = req.body ?? {};
  const required = ['nombre', 'email', 'telefono', 'direccion', 'ciudad', 'cp', 'pais', 'productos'];
  for (const f of required) {
    if (!body[f] && body[f] !== 0) { res.status(400).json({ error: `Campo obligatorio: ${f}` }); return; }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const productosValidados: any[] = [];

    for (const prod of body.productos) {
      const prodId   = parseInt(prod.id ?? 0);
      const talla    = prod.talla ?? '';
      const cantidad = parseInt(prod.cantidad ?? 1);
      if (!prodId || !talla || cantidad <= 0) { await client.query('ROLLBACK'); res.status(400).json({ error: 'Producto con datos inválidos' }); return; }

      const { rows } = await client.query(
        'SELECT id, name, price, discounted_price, sizes, image_url FROM productos WHERE id = $1 FOR UPDATE',
        [prodId]
      );
      if (!rows.length) { await client.query('ROLLBACK'); res.status(400).json({ error: `Producto #${prodId} no encontrado` }); return; }

      const dbProd = rows[0];
      const precio = dbProd.discounted_price ? parseFloat(dbProd.discounted_price) : parseFloat(dbProd.price);
      const sizes: { size: string; stock: number }[] = typeof dbProd.sizes === 'string' ? JSON.parse(dbProd.sizes) : dbProd.sizes;
      const sizeEntry = sizes.find(s => s.size === talla);
      if (!sizeEntry || sizeEntry.stock < cantidad) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: `Stock insuficiente para ${dbProd.name} talla ${talla}` }); return;
      }

      total += precio * cantidad;
      productosValidados.push({ id: prodId, nombre: dbProd.name, imageUrl: dbProd.image_url, talla, cantidad, precio, sizes });
    }

    total = Math.round(total * 100) / 100;

    const { rows: pedidoRows } = await client.query(
      `INSERT INTO pedidos (user_id, nombre_cliente, email, telefono, direccion, ciudad, cp, pais, total, estado, paypal_transaction_id, productos_json, fecha_creacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'procesando',$10,$11,NOW()) RETURNING id`,
      [
        req.user?.id ?? null,
        body.nombre, body.email, body.telefono, body.direccion,
        body.ciudad, body.cp, body.pais, total,
        body.paypalTransactionId ?? null,
        JSON.stringify(productosValidados),
      ]
    );
    const pedidoId = pedidoRows[0].id;

    await client.query('INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES ($1,$2,NOW())', [pedidoId, 'procesando']);

    for (const prod of productosValidados) {
      for (const s of prod.sizes) {
        if (s.size === prod.talla) s.stock = Math.max(0, s.stock - prod.cantidad);
      }
      await client.query('UPDATE productos SET sizes = $1 WHERE id = $2', [JSON.stringify(prod.sizes), prod.id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { pedidoId, mensaje: 'Pedido creado correctamente' } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// GET /api/orders (admin)
router.get('/', requireAdmin, async (req, res) => {
  const estado = req.query.estado as string | undefined;
  const params: any[] = [];
  const where = estado && estado !== 'todos' ? `WHERE estado = $${params.push(estado)}` : '';
  const { rows } = await pool.query(
    `SELECT p.*, COALESCE(
      (SELECT json_agg(json_build_object('estado',h.estado,'fecha',h.fecha) ORDER BY h.fecha)
       FROM pedido_historial h WHERE h.pedido_id = p.id), '[]'
     ) as historial
     FROM pedidos p ${where} ORDER BY p.fecha_creacion DESC`,
    params
  );
  res.json({ success: true, data: rows.map(mapPedido) });
});

// GET /api/orders/user
router.get('/user', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM pedidos WHERE user_id = $1 ORDER BY fecha_creacion DESC',
    [req.user!.id]
  );
  res.json({ success: true, data: rows });
});

// GET /api/orders/stats
router.get('/stats', requireAdmin, async (req, res) => {
  const tipo = req.query.tipo as string;

  if (tipo === 'chart') {
    const { rows } = await pool.query(
      `SELECT DATE(fecha_creacion) as fecha,
              COALESCE(SUM(total),0) as ingresos,
              COUNT(*) as pedidos
       FROM pedidos WHERE estado != 'cancelado' AND fecha_creacion >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(fecha_creacion) ORDER BY fecha`
    );
    res.json({ success: true, data: rows.map(r => ({ fecha: r.fecha, ingresos: parseFloat(r.ingresos), pedidos: parseInt(r.pedidos) })) });
    return;
  }

  if (tipo === 'top') {
    const { rows: pedidos } = await pool.query(
      `SELECT productos_json, total FROM pedidos WHERE estado = 'entregado' AND fecha_creacion >= NOW() - INTERVAL '30 days'`
    );

    const productMap: Record<number, { id: number; nombre: string; imageUrl: string; unidadesVendidas: number; ingresos: number }> = {};
    let totalIngresos = 0;
    let completados = 0;

    for (const p of pedidos) {
      totalIngresos += parseFloat(p.total);
      completados++;
      const prods: any[] = typeof p.productos_json === 'string' ? JSON.parse(p.productos_json) : p.productos_json ?? [];
      for (const prod of prods) {
        const id = parseInt(prod.id);
        if (!productMap[id]) productMap[id] = { id, nombre: prod.nombre, imageUrl: prod.imageUrl, unidadesVendidas: 0, ingresos: 0 };
        productMap[id].unidadesVendidas += parseInt(prod.cantidad);
        productMap[id].ingresos += parseFloat(prod.precio) * parseInt(prod.cantidad);
      }
    }

    const productos = Object.values(productMap).sort((a, b) => b.unidadesVendidas - a.unidadesVendidas).slice(0, 10);
    const ticketMedio = completados > 0 ? Math.round((totalIngresos / completados) * 100) / 100 : 0;
    const productoEstrella = productos[0]?.nombre ?? '-';

    res.json({ success: true, data: { productos, resumen: { ingresos: totalIngresos, pedidosCompletados: completados, ticketMedio, productoEstrella } } });
    return;
  }

  res.status(400).json({ error: 'tipo inválido' });
});

// GET /api/orders/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, COALESCE(
      (SELECT json_agg(json_build_object('estado',h.estado,'fecha',h.fecha) ORDER BY h.fecha)
       FROM pedido_historial h WHERE h.pedido_id = p.id), '[]'
     ) as historial
     FROM pedidos p WHERE p.id = $1`,
    [parseInt(req.params.id)]
  );
  if (!rows.length) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
  res.json({ success: true, data: mapPedido(rows[0]) });
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', requireAdmin, async (req, res) => {
  const { estado } = req.body ?? {};
  const valid = ['procesando', 'enviado', 'entregado', 'cancelado'];
  if (!valid.includes(estado)) { res.status(400).json({ error: 'Estado inválido' }); return; }

  await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, parseInt(req.params.id)]);
  await pool.query('INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES ($1,$2,NOW())', [parseInt(req.params.id), estado]);
  res.json({ success: true, data: { mensaje: 'Estado actualizado' } });
});

export default router;
