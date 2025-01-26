// Importaciones necesarias
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender el tipo Request de Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: any;  // Permite almacenar el usuario en el objeto request
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener el token del header Authorization
    // Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1];

    // Verificar si existe el token
    if (!token) {
      return res.status(401).json({ error: 'Access denied' });
    }

    // Verificar que existe la clave secreta
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    // Verificar el token
    const verified = jwt.verify(token, secret);
    
    // Guardar el usuario verificado en el request
    req.user = verified;
    
    // Continuar con la siguiente función
    next();
  } catch (error) {
    // Si hay error, devolver 403 Forbidden
    res.status(403).json({ error: 'Invalid token' });
  }
};
