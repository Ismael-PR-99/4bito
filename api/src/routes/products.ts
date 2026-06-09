import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

function decadeToRange(dec: string): [number, number] | null {
  const m = dec.match(/^(\d{2})s$/);
  if (!m) return null;
  const d = parseInt(m[1]);
  const start = d >= 70 ? 1900 + d : 2000 + d;
  return [start, start + 9];
}

function mapRow(row: any) {
  return {
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
    sku:             row.sku ?? null,
    ratingAvg:       parseFloat(row.rating_avg ?? 0),
    ratingCount:     parseInt(row.rating_count ?? 0),
  };
}

// GET /api/products
router.get('/', async (req, res) => {
  const { category, decade, new: isNew, sort = 'newest' } = req.query as Record<string, string>;

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (category) { where.push(`category = $${i++}`); params.push(category); }
  if (decade) {
    const range = decadeToRange(decade);
    if (!range) { res.status(400).json({ error: 'Formato de década inválido (ej: 90s)' }); return; }
    where.push(`year BETWEEN $${i++} AND $${i++}`);
    params.push(range[0], range[1]);
  }
  if (isNew === '1') where.push(`(is_new = 1 OR created_at >= NOW() - INTERVAL '30 days')`);

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSQL = sort === 'price-asc' ? 'ORDER BY price ASC' : sort === 'price-desc' ? 'ORDER BY price DESC' : 'ORDER BY created_at DESC';

  const { rows } = await pool.query(
    `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new, sku, rating_avg, rating_count, created_at
     FROM productos ${whereSQL} ${orderSQL} LIMIT 100`,
    params
  );

  res.json({ success: true, data: rows.map(mapRow) });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new, sku, rating_avg, rating_count, created_at
     FROM productos WHERE id = $1`,
    [parseInt(req.params.id)]
  );
  if (!rows.length) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
  res.json({ success: true, data: mapRow(rows[0]) });
});

// GET /api/products/:id/frequently-bought
router.get('/:id/frequently-bought', async (req, res) => {
  const productId = parseInt(req.params.id);
  const { rows: productRows } = await pool.query('SELECT category FROM productos WHERE id = $1', [productId]);
  if (!productRows.length) { res.json({ success: true, data: [] }); return; }

  const { rows } = await pool.query(
    `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new
     FROM productos WHERE category = $1 AND id != $2 ORDER BY RANDOM() LIMIT 4`,
    [productRows[0].category, productId]
  );
  res.json({ success: true, data: rows.map(mapRow) });
});

// POST /api/products (admin)
router.post('/', requireAdmin, upload.single('image'), async (req: Request, res) => {
  const { name, team, league, price, year, category, sizes } = req.body ?? {};

  if (!name || !team || !league || price === undefined || year === undefined || !category) {
    res.status(400).json({ error: 'name, team, league, price, year y category son obligatorios' }); return;
  }
  if (!req.file) { res.status(400).json({ error: 'La imagen es obligatoria' }); return; }

  const sizesDecoded = sizes ? JSON.parse(sizes) : [];
  const imageUrl = `${process.env.UPLOAD_URL}/${req.file.filename}`;

  const { rows } = await pool.query(
    `INSERT INTO productos (name, price, team, year, league, image_url, category, sizes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [name, parseFloat(price), team, parseInt(year), league, imageUrl, category, JSON.stringify(sizesDecoded)]
  );

  const newId = rows[0].id;
  const catAbbrev = category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const sku = `4BT-${catAbbrev}-${year}-${String(newId).padStart(4, '0')}`;
  await pool.query('UPDATE productos SET sku = $1 WHERE id = $2', [sku, newId]);

  res.status(201).json({
    success: true,
    data: {
      mensaje: 'Producto creado correctamente',
      producto: { id: newId, name, price: parseFloat(price), team, year: parseInt(year), league, imageUrl, category, sizes: sizesDecoded, sku },
    },
  });
});

// PUT /api/products/:id (admin)
router.put('/:id', requireAdmin, upload.single('image'), async (req: Request, res) => {
  const id = parseInt(req.params.id);
  const { name, team, league, price, year, category, sizes } = req.body ?? {};

  const { rows: existing } = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
  if (!existing.length) { res.status(404).json({ error: 'Producto no encontrado' }); return; }

  const prev = existing[0];
  const imageUrl = req.file ? `${process.env.UPLOAD_URL}/${req.file.filename}` : prev.image_url;
  const sizesDecoded = sizes ? JSON.parse(sizes) : (typeof prev.sizes === 'string' ? JSON.parse(prev.sizes) : prev.sizes);

  await pool.query(
    `UPDATE productos SET name=$1, price=$2, team=$3, year=$4, league=$5, image_url=$6, category=$7, sizes=$8 WHERE id=$9`,
    [
      name ?? prev.name,
      price !== undefined ? parseFloat(price) : parseFloat(prev.price),
      team ?? prev.team,
      year !== undefined ? parseInt(year) : parseInt(prev.year),
      league ?? prev.league,
      imageUrl,
      category ?? prev.category,
      JSON.stringify(sizesDecoded),
      id,
    ]
  );

  const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
  res.json({ success: true, data: { mensaje: 'Producto actualizado', producto: mapRow(rows[0]) } });
});

// DELETE /api/products/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
  if (!rowCount) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
  res.json({ success: true, data: { mensaje: 'Producto eliminado', id } });
});

// PUT /api/products/:id/stock (admin)
router.put('/:id/stock', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { stock } = req.body ?? {};
  if (!stock || typeof stock !== 'object') { res.status(400).json({ error: 'stock es obligatorio' }); return; }

  const { rows } = await pool.query('SELECT sizes FROM productos WHERE id = $1', [id]);
  if (!rows.length) { res.status(404).json({ error: 'Producto no encontrado' }); return; }

  const sizes: { size: string; stock: number }[] = typeof rows[0].sizes === 'string' ? JSON.parse(rows[0].sizes) : rows[0].sizes;
  for (const s of sizes) {
    if (stock[s.size] !== undefined) s.stock = parseInt(stock[s.size]);
  }

  await pool.query('UPDATE productos SET sizes = $1 WHERE id = $2', [JSON.stringify(sizes), id]);
  res.json({ success: true, data: { mensaje: 'Stock actualizado' } });
});

export default router;
