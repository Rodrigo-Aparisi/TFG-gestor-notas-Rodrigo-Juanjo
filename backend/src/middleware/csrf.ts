import { Request, Response, NextFunction } from 'express';

/**
 * Defensa CSRF por cabecera personalizada.
 *
 * Para métodos mutantes (POST/PUT/PATCH/DELETE) exige la cabecera
 * `X-Requested-With: XMLHttpRequest`. Las cabeceras personalizadas no pueden
 * ser enviadas por un formulario HTML cross-site sin un preflight CORS, así
 * que su presencia confirma que la petición viene de nuestro SPA (mismo origen).
 * Complementa al `SameSite=Strict` del refresh token.
 *
 * Los métodos seguros (GET/HEAD/OPTIONS) se dejan pasar.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireXRequestedWith(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    next();
    return;
  }

  res
    .status(403)
    .json({ error: 'CSRF: cabecera X-Requested-With requerida', code: 'CSRF_HEADER_MISSING' });
}
