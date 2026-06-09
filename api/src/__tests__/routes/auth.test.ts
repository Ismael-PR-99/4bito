import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Set env before any module uses it
beforeAll(() => {
  process.env.JWT_SECRET     = 'test-secret-auth-routes';
  process.env.JWT_EXPIRES_IN = '3600';
  process.env.NODE_ENV       = 'test';
});

// Mock db pool
vi.mock('../../db', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

async function buildApp() {
  const { default: authRoutes } = await import('../../routes/auth');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRoutes);
  return app;
}

describe('POST /auth/login', () => {
  it('returns 400 for invalid email', async () => {
    const app = await buildApp();
    const res = await request(app).post('/auth/login').send({ email: 'bad', password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for empty password', async () => {
    const app = await buildApp();
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: '' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const app = await buildApp();
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Credenciales');
  });
});

describe('POST /auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for short password', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ nombre: 'Juan', email: 'j@test.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('8 caracteres');
  });

  it('returns 400 for invalid email', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ nombre: 'Juan', email: 'notanemail', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);

    const app = await buildApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ nombre: 'Juan', email: 'existing@test.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('registrado');
  });

  it('returns 201 on successful registration', async () => {
    const { pool } = await import('../../db');
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as any)    // check existing
      .mockResolvedValueOnce({ rows: [] } as any);    // insert

    const app = await buildApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ nombre: 'Juan', email: 'new@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /auth/logout', () => {
  it('clears cookie and returns success', async () => {
    const app = await buildApp();
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
