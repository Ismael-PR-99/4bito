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
  return m ? m[1] : null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) req.user = verifyToken(token) ?? undefined;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Token requerido' }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Token inválido o expirado' }); return; }
  req.user = payload;
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
