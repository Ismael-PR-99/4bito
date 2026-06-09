import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRES = parseInt(process.env.JWT_EXPIRES_IN ?? '86400');

export interface JwtPayload {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export type TokenResult =
  | { ok: true;  payload: JwtPayload }
  | { ok: false; reason: 'expired' | 'invalid' };

export function verifyToken(token: string): TokenResult {
  try {
    return { ok: true, payload: jwt.verify(token, SECRET) as JwtPayload };
  } catch (e) {
    return { ok: false, reason: e instanceof jwt.TokenExpiredError ? 'expired' : 'invalid' };
  }
}
