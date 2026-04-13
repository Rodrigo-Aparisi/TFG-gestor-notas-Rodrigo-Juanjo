import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database';
import { AuthUser } from '../models/types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware de autenticación JWT para rutas protegidas.
 *
 * Proceso de validación (en orden):
 * 1. Extrae el token del header `Authorization: Bearer <token>`.
 * 2. Verifica la firma JWT con `JWT_SECRET` mediante `jwt.verify`.
 * 3. Rechaza tokens con `type === 'refresh'` (previene su uso como access tokens).
 * 4. Consulta `revoked_tokens` para detectar tokens en la blacklist.
 * 5. Inyecta `req.user: AuthUser` con `{ id, email }` del payload.
 *
 * @param req - Express Request. Debe incluir `Authorization: Bearer <token>`.
 *              Tras la validación, `req.user` queda poblado con `{ id, email }`.
 * @param res - Express Response
 * @param next - Continúa al siguiente middleware o controller si el token es válido
 *
 * @returns
 *   - `401` si no hay token (`Access denied - No token`)
 *   - `401` si el token ha expirado (`code: TOKEN_EXPIRED`)
 *   - `401` si el token es de tipo refresh
 *   - `403` si el token tiene firma inválida (`code: INVALID_TOKEN`)
 *   - `403` si el token está en la blacklist (`Token has been revoked`)
 *   - `403` si falla la consulta a BD (fail-closed: error → deniega acceso)
 *   - Llama a `next()` si todas las verificaciones pasan
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied - No token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET no definido');
      throw new Error('JWT_SECRET is not defined');
    }

    const verified = jwt.verify(token, secret);

    // Asegurarse de que el ID esté presente
    if (!verified || typeof verified !== 'object' || !verified.id) {
      console.error('Token válido pero sin ID de usuario');
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Rechazar refresh tokens usados como access tokens
    if ((verified as any).type === 'refresh') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    // Check if token is revoked (blacklisted)
    const revokedCheck = await pool.query(
      'SELECT 1 FROM revoked_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (revokedCheck.rows.length > 0) {
      return res.status(403).json({ error: 'Token has been revoked' });
    }

    req.user = verified as AuthUser;

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);

    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(403).json({
      error: 'Invalid token',
      ...(process.env.NODE_ENV !== 'production' && { details: error instanceof Error ? error.message : 'Error desconocido' })
    });
  }
};
