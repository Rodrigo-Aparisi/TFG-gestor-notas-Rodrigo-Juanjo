import express from 'express';
import { emailService } from '../services/emailService';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Middleware para logging de requests (ayuda en debugging)
router.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Ruta para el formulario de contacto
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Datos incompletos', 
        message: 'Todos los campos son requeridos' 
      });
    }
    
    console.log('Datos de contacto recibidos:', { name, email, message });
    
    // Usar la nueva función específica para contacto
    const success = await emailService.sendContactEmail(name, email, message);
    
    if (success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Mensaje enviado correctamente' 
      });
    } else {
      throw new Error('No se pudo enviar el mensaje');
    }
    
  } catch (error) {
    console.error('Error en ruta de contacto:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
