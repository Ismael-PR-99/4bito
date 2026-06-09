import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

beforeAll(() => {
  process.env.JWT_SECRET     = 'test-secret-products';
  process.env.JWT_EXPIRES_IN = '3600';
  process.env.UPLOAD_DIR     = '/tmp/test-uploads';
  process.env.UPLOAD_URL     = 'http://localhost:3000/uploads';
});

vi.mock('../../db', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const multerMiddleware = (_req: any, _res: any, next: () => void) => next();
const multerInstance   = { single: vi.fn().mockReturnValue(multerMiddleware) };
const multerFn         = vi.fn().mockReturnValue(multerInstance) as any;
multerFn.diskStorage   = vi.fn().mockReturnValue({});

vi.mock('multer', () => ({ default: multerFn }));

vi.mock('fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('fs')>();
  return { ...real, existsSync: vi.fn().mockReturnValue(true), mkdirSync: vi.fn() };
});

async function buildApp() {
  const { default: productsRoutes } = await import('../../routes/products');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/products', productsRoutes);
  return app;
}

const mockRow = {
  id: '1', name: 'Camiseta Barcelona 1992', price: '89.99',
  discount_percent: '0', discounted_price: null,
  team: 'Barcelona', year: '1992', league: 'La Liga',
  image_url: 'http://localhost:3000/uploads/img.jpg',
  category: 'camisetas',
  sizes: JSON.stringify([{ size: 'M', stock: 5 }, { size: 'L', stock: 2 }]),
  is_new: '0', sku: '4BT-CAM-1992-0001', rating_avg: '4.2',
  rating_count: '8', created_at: new Date().toISOString(),
};

// ── GET / ────────────────────────────────────────────────────────────────────

describe('GET /products', () => {
  it('returns paginated list', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [mockRow] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

    const app  = await buildApp();
    const res  = await request(app).get('/products?_t=1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(24);
  });

  it('returns empty list when no products match filters', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products?category=inexistente&_t=2');
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('returns 400 for invalid decade format', async () => {
    const app = await buildApp();
    const res = await request(app).get('/products?decade=invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Formato de década');
  });

  it('accepts valid decade format (90s)', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products?decade=90s&_t=4');
    expect(res.status).toBe(200);
  });

  it('accepts search param and returns results', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [mockRow] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products?search=Barcelona&_t=5');
    expect(res.status).toBe(200);
    expect(res.body.data.products[0].team).toBe('Barcelona');
  });

  it('returns cached response on second identical request', async () => {
    const { pool } = await import('../../db');
    const before = vi.mocked(pool.query).mock.calls.length;

    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [mockRow] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

    const app = await buildApp();
    await request(app).get('/products?_cachetest=1');
    const afterFirst = vi.mocked(pool.query).mock.calls.length;
    expect(afterFirst).toBe(before + 2); // 2 queries (SELECT + COUNT)

    await request(app).get('/products?_cachetest=1'); // same key → cache hit
    const afterSecond = vi.mocked(pool.query).mock.calls.length;
    expect(afterSecond).toBe(afterFirst); // no extra queries
  });

  it('clamps limit to max 48', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products?limit=999&_t=7');
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(48);
  });
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

describe('GET /products/:id', () => {
  it('returns product when found', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [mockRow] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toBe(mockRow.name);
    expect(res.body.data.price).toBe(89.99);
    expect(res.body.data.sizes).toHaveLength(2);
  });

  it('returns 404 when product not found', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrado');
  });

  it('returns 500 on DB error', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB error'));

    const app = await buildApp();
    const res = await request(app).get('/products/1');
    expect(res.status).toBe(500);
  });
});

// ── GET /:id/frequently-bought ────────────────────────────────────────────────

describe('GET /products/:id/frequently-bought', () => {
  it('returns related products', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ category: 'camisetas' }] } as any)
      .mockResolvedValueOnce({ rows: [mockRow] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products/1/frequently-bought');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns empty array when product not found', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const app = await buildApp();
    const res = await request(app).get('/products/9999/frequently-bought');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ── Admin write routes — auth guard ──────────────────────────────────────────

describe('POST /products — admin guard', () => {
  it('returns 401 without token', async () => {
    const app = await buildApp();
    const res = await request(app).post('/products').send({});
    expect(res.status).toBe(401);
  });
});

describe('PUT /products/:id — admin guard', () => {
  it('returns 401 without token', async () => {
    const app = await buildApp();
    const res = await request(app).put('/products/1').send({});
    expect(res.status).toBe(401);
  });
});

describe('DELETE /products/:id — admin guard', () => {
  it('returns 401 without token', async () => {
    const app = await buildApp();
    const res = await request(app).delete('/products/1');
    expect(res.status).toBe(401);
  });
});

describe('PUT /products/:id/stock — admin guard', () => {
  it('returns 401 without token', async () => {
    const app = await buildApp();
    const res = await request(app).put('/products/1/stock').send({ stock: { M: 5 } });
    expect(res.status).toBe(401);
  });
});
