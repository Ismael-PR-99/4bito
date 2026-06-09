import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Datos inválidos';
      res.status(400).json({ error: msg });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Shared schemas ────────────────────────────────────────────────────────────

export const emailSchema = z.string().email('Email inválido').max(254);
export const passSchema  = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128);
export const nameSchema  = z.string().min(1, 'El nombre es obligatorio').max(100).trim();

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

export const registerSchema = z.object({
  nombre:   nameSchema,
  email:    emailSchema,
  password: passSchema,
});

// ── Orders ────────────────────────────────────────────────────────────────────

const productoLineSchema = z.object({
  id:       z.coerce.number().int().positive(),
  talla:    z.string().min(1).max(10).trim(),
  cantidad: z.coerce.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  nombre:              nameSchema,
  email:               emailSchema,
  telefono:            z.string().min(6).max(20).trim(),
  direccion:           z.string().min(3).max(200).trim(),
  ciudad:              z.string().min(1).max(100).trim(),
  cp:                  z.string().min(1).max(20).trim(),
  pais:                z.string().min(1).max(100).trim(),
  productos:           z.array(productoLineSchema).min(1).max(50),
  paypalTransactionId: z.string().max(100).optional(),
});

// ── Products (admin) ──────────────────────────────────────────────────────────

const tallaSchema = z.object({
  size:  z.string().min(1).max(10),
  stock: z.coerce.number().int().min(0),
});

export const createProductSchema = z.object({
  name:     z.string().min(1).max(200).trim(),
  team:     z.string().min(1).max(100).trim(),
  league:   z.string().min(1).max(100).trim(),
  price:    z.coerce.number().positive().max(9999),
  year:     z.coerce.number().int().min(1900).max(2100),
  category: z.string().min(1).max(50).trim(),
  sizes:    z.preprocess(
    v => { try { return typeof v === 'string' ? JSON.parse(v as string) : v; } catch { return v; } },
    z.array(tallaSchema).optional().default([])
  ),
});

export const updateProductSchema = createProductSchema.partial();

// ── Discounts ─────────────────────────────────────────────────────────────────

export const validateCodeSchema = z.object({
  code: z.string().min(1).max(50).trim(),
});

// ── Stock notifications ────────────────────────────────────────────────────────

export const notifyWaitlistSchema = z.object({
  productId: z.coerce.number().int().positive(),
  size:      z.string().min(1).max(10).trim(),
});

export const subscribeNotifSchema = z.object({
  productId: z.coerce.number().int().positive(),
  size:      z.string().min(1).max(10).trim(),
  email:     emailSchema,
});

// ── Password reset ─────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token:    z.string().min(1).max(64),
  password: passSchema,
});
