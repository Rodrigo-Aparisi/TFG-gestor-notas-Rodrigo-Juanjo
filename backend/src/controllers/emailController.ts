import { Request, Response } from 'express';
import { emailService } from '../services/emailService';

export const emailController = {
  async sendTestEmail(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const { email, username } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'El email es requerido'
        });
      }

      const messageId = await emailService.sendTestEmail(
        email,
        username || 'Usuario de Prueba'
      );

      res.json({
        success: true,
        message: 'Email de prueba enviado correctamente',
        messageId
      });
    } catch (error) {
      console.error('Error al enviar email de prueba:', error);
      res.status(500).json({
        error: 'Error al enviar email de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  async checkReminders(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      // Verificar si el usuario es administrador (opcional)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'No tienes permisos para ejecutar esta acción'
        });
      }

      await emailService.checkUpcomingReminders();

      res.json({
        success: true,
        message: 'Comprobación de recordatorios iniciada correctamente'
      });
    } catch (error) {
      console.error('Error al comprobar recordatorios:', error);
      res.status(500).json({
        error: 'Error al comprobar recordatorios',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
};
