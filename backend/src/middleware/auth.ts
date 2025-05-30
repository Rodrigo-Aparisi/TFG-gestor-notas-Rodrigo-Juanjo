import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

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

    req.user = verified;
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(403).json({ 
      error: 'Invalid token',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
