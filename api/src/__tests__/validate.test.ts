import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, loginSchema, registerSchema, createOrderSchema } from '../validate';

function mockReqRes(body: unknown): { req: Request; res: Response; next: NextFunction; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json   = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res    = { status, json } as unknown as Response;
  const req    = { body } as Request;
  const next   = vi.fn() as unknown as NextFunction;
  return { req, res, next, json, status };
}

describe('validate middleware', () => {
  it('calls next() when body is valid', () => {
    const schema = z.object({ name: z.string() });
    const mw = validate(schema);
    const { req, res, next } = mockReqRes({ name: 'test' });
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });

  it('returns 400 when body is invalid', () => {
    const schema = z.object({ name: z.string() });
    const mw = validate(schema);
    const { req, res, next, status, json } = mockReqRes({ name: 123 });
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('replaces req.body with parsed (coerced) data', () => {
    const schema = z.object({ id: z.coerce.number() });
    const mw = validate(schema);
    const { req, res, next } = mockReqRes({ id: '42' });
    mw(req, res, next);
    expect(req.body.id).toBe(42);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(r.success).toBe(false);
  });

  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse({ nombre: 'Juan', email: 'j@test.com', password: 'password123' }).success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const r = registerSchema.safeParse({ nombre: 'Juan', email: 'j@test.com', password: 'short' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain('8 caracteres');
  });

  it('rejects missing nombre', () => {
    expect(registerSchema.safeParse({ nombre: '', email: 'j@test.com', password: 'password123' }).success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  const validOrder = {
    nombre:    'Ana García',
    email:     'ana@test.com',
    telefono:  '612345678',
    direccion: 'Calle Mayor 1',
    ciudad:    'Madrid',
    cp:        '28001',
    pais:      'España',
    productos: [{ id: 1, talla: 'M', cantidad: 2 }],
  };

  it('accepts a valid order', () => {
    expect(createOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it('rejects empty productos array', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, productos: [] }).success).toBe(false);
  });

  it('rejects producto with cantidad 0', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, productos: [{ id: 1, talla: 'M', cantidad: 0 }] }).success).toBe(false);
  });

  it('coerces producto id and cantidad from strings', () => {
    const r = createOrderSchema.safeParse({ ...validOrder, productos: [{ id: '3', talla: 'L', cantidad: '1' }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.productos[0].id).toBe(3);
      expect(r.data.productos[0].cantidad).toBe(1);
    }
  });

  it('rejects invalid email in order', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, email: 'bad' }).success).toBe(false);
  });
});
