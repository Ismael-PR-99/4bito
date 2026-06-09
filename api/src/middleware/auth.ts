import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization ?? '';
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  if (m) return m[1];
  return (req as any).cookies?.token ?? null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const result = verifyToken(token);
    if (result.ok) req.user = result.payload;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Token requerido' }); return; }
  const result = verifyToken(token);
  if (!result.ok) {
    const msg = result.reason === 'expired' ? 'Token expirado' : 'Token inválido';
    res.status(401).json({ error: msg }); return;
  }
  req.user = result.payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.rol !== 'admin') {
      res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
      return;
    }
    next();
  });
}
