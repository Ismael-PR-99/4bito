import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../db';
import { requireAdmin } from '../middleware/auth';
import { validate, createProductSchema, updateProductSchema } from '../validate';

const router = Router();

const listCache = new Map<string, { payload: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 60 s

function cacheGet(key: string): unknown | null {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.ts > CACHE_TTL) return null;
  return hit.payload;
}
function cacheSet(key: string, payload: unknown): void { listCache.set(key, { payload, ts: Date.now() }); }
function cacheBust(): void { listCache.clear(); }

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
  try {
    const cacheKey = JSON.stringify(req.query);
    const cached = cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const { category, decade, new: isNew, sort = 'newest', search } = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1')));
    const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit ?? '24'))));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (search?.trim()) {
      const q = search.trim();
      where.push(`(
        to_tsvector('spanish', name || ' ' || team || ' ' || league) @@ plainto_tsquery('spanish', $${i})
        OR name ILIKE $${i + 1}
      )`);
      params.push(q, `%${q}%`);
      i += 2;
    }
    if (category) { where.push(`category = $${i++}`); params.push(category); }
    if (decade) {
      const range = decadeToRange(decade);
      if (!range) { res.status(400).json({ error: 'Formato de década inválido (ej: 90s)' }); return; }
      where.push(`year BETWEEN $${i++} AND $${i++}`);
      params.push(range[0], range[1]);
    }
    if (isNew === '1') where.push(`(is_new = 1 OR created_at >= NOW() - INTERVAL '30 days')`);

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSQL = search?.trim()
      ? `ORDER BY ts_rank(to_tsvector('spanish', name || ' ' || team || ' ' || league), plainto_tsquery('spanish', $1)) DESC`
      : sort === 'price-asc' ? 'ORDER BY price ASC'
      : sort === 'price-desc' ? 'ORDER BY price DESC'
      : 'ORDER BY created_at DESC';

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new, sku, rating_avg, rating_count, created_at
         FROM productos ${whereSQL} ${orderSQL} LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM productos ${whereSQL}`, params),
    ]);

    const response = {
      success: true,
      data: { products: rows.map(mapRow), total: parseInt(countRows[0].count), page, limit },
    };
    cacheSet(cacheKey, response);
    res.json(response);
  } catch (e) {
    console.error('[products] GET / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new, sku, rating_avg, rating_count, created_at
       FROM productos WHERE id = $1`,
      [parseInt(req.params.id)]
    );
    if (!rows.length) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    res.json({ success: true, data: mapRow(rows[0]) });
  } catch (e) {
    console.error('[products] GET /:id error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/products/:id/frequently-bought
router.get('/:id/frequently-bought', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rows: productRows } = await pool.query('SELECT category FROM productos WHERE id = $1', [productId]);
    if (!productRows.length) { res.json({ success: true, data: [] }); return; }

    const { rows } = await pool.query(
      `SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, is_new
       FROM productos WHERE category = $1 AND id != $2 ORDER BY RANDOM() LIMIT 4`,
      [productRows[0].category, productId]
    );
    res.json({ success: true, data: rows.map(mapRow) });
  } catch (e) {
    console.error('[products] GET /:id/frequently-bought error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/products (admin)
router.post('/', requireAdmin, upload.single('image'), validate(createProductSchema), async (req: Request, res) => {
  const cleanupFile = () => {
    if (req.file) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, req.file!.filename)); } catch {}
    }
  };

  try {
    if (!req.file) { res.status(400).json({ error: 'La imagen es obligatoria' }); return; }

    const { name, team, league, price, year, category, sizes: sizesDecoded } = req.body;

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
    cacheBust();

    res.status(201).json({
      success: true,
      data: {
        mensaje: 'Producto creado correctamente',
        producto: { id: newId, name, price: parseFloat(price), team, year: parseInt(year), league, imageUrl, category, sizes: sizesDecoded, sku },
      },
    });
  } catch (e) {
    cleanupFile();
    console.error('[products] POST / error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', requireAdmin, upload.single('image'), validate(updateProductSchema), async (req: Request, res) => {
  const cleanupFile = () => {
    if (req.file) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, req.file!.filename)); } catch {}
    }
  };

  try {
    const id = parseInt(req.params.id);
    const { name, team, league, price, year, category, sizes } = req.body;

    const { rows: existing } = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (!existing.length) { cleanupFile(); res.status(404).json({ error: 'Producto no encontrado' }); return; }

    const prev = existing[0];
    const imageUrl = req.file ? `${process.env.UPLOAD_URL}/${req.file.filename}` : prev.image_url;
    const sizesDecoded = sizes ?? (typeof prev.sizes === 'string' ? JSON.parse(prev.sizes) : prev.sizes);

    await pool.query(
      `UPDATE productos SET name=$1, price=$2, team=$3, year=$4, league=$5, image_url=$6, category=$7, sizes=$8 WHERE id=$9`,
      [
        name     ?? prev.name,
        price    ?? parseFloat(prev.price),
        team     ?? prev.team,
        year     ?? parseInt(prev.year),
        league   ?? prev.league,
        imageUrl,
        category ?? prev.category,
        JSON.stringify(sizesDecoded),
        id,
      ]
    );

    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    cacheBust();
    res.json({ success: true, data: { mensaje: 'Producto actualizado', producto: mapRow(rows[0]) } });
  } catch (e) {
    cleanupFile();
    console.error('[products] PUT /:id error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
    if (!rowCount) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    cacheBust();
    res.json({ success: true, data: { mensaje: 'Producto eliminado', id } });
  } catch (e) {
    console.error('[products] DELETE /:id error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/products/:id/stock (admin)
router.put('/:id/stock', requireAdmin, async (req, res) => {
  try {
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
    cacheBust();
    res.json({ success: true, data: { mensaje: 'Stock actualizado' } });
  } catch (e) {
    console.error('[products] PUT /:id/stock error:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
