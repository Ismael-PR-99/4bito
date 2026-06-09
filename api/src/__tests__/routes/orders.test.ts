import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

beforeAll(() => {
  process.env.JWT_SECRET     = 'test-secret-orders';
  process.env.JWT_EXPIRES_IN = '3600';
});

vi.mock('../../db', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('../../email', () => ({
  sendOrderConfirmation: vi.fn(),
  sendNewOrderAlert:     vi.fn(),
}));

async function buildApp() {
  const { default: ordersRoutes } = await import('../../routes/orders');
  const app = express();
  app.use(express.json());
  app.use('/orders', ordersRoutes);
  return app;
}

const validOrder = {
  nombre:    'Ana García',
  email:     'ana@test.com',
  telefono:  '612345678',
  direccion: 'Calle Mayor 1',
  ciudad:    'Madrid',
  cp:        '28001',
  pais:      'España',
  productos: [{ id: 1, talla: 'M', cantidad: 1 }],
};

describe('POST /orders — validation', () => {
  it('returns 400 for missing campos', async () => {
    const app = await buildApp();
    const res = await request(app).post('/orders').send({ nombre: 'Solo nombre' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const app = await buildApp();
    const res = await request(app).post('/orders').send({ ...validOrder, email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty productos array', async () => {
    const app = await buildApp();
    const res = await request(app).post('/orders').send({ ...validOrder, productos: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for cantidad 0', async () => {
    const app = await buildApp();
    const res = await request(app).post('/orders').send({
      ...validOrder,
      productos: [{ id: 1, talla: 'M', cantidad: 0 }],
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when product not found in DB', async () => {
    const { pool } = await import('../../db');
    const client = { query: vi.fn(), release: vi.fn() };
    client.query
      .mockResolvedValueOnce(undefined)          // BEGIN
      .mockResolvedValueOnce({ rows: [] });       // SELECT producto → not found
    vi.mocked(pool.connect).mockResolvedValueOnce(client as any);

    const app = await buildApp();
    const res = await request(app).post('/orders').send(validOrder);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no encontrado');
  });

  it('returns 400 when stock is insufficient', async () => {
    const { pool } = await import('../../db');
    const client = { query: vi.fn(), release: vi.fn() };
    client.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{
          id: 1, name: 'Camiseta', price: '29.99', discounted_price: null,
          image_url: '/img.jpg',
          sizes: JSON.stringify([{ size: 'M', stock: 0 }]),
        }],
      });
    vi.mocked(pool.connect).mockResolvedValueOnce(client as any);

    const app = await buildApp();
    const res = await request(app).post('/orders').send(validOrder);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Stock insuficiente');
  });

  it('creates order and returns 201 on success', async () => {
    const { pool } = await import('../../db');
    const client = { query: vi.fn(), release: vi.fn() };
    client.query
      .mockResolvedValueOnce(undefined)           // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 1, name: 'Camiseta', price: '29.99', discounted_price: null,
          image_url: '/img.jpg',
          sizes: JSON.stringify([{ size: 'M', stock: 5 }]),
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })  // INSERT pedido
      .mockResolvedValueOnce(undefined)                // UPDATE sizes
      .mockResolvedValueOnce(undefined);               // COMMIT
    vi.mocked(pool.connect).mockResolvedValueOnce(client as any);

    const app = await buildApp();
    const res = await request(app).post('/orders').send(validOrder);
    expect(res.status).toBe(201);
    expect(res.body.data.pedidoId).toBe(42);
  });
});
