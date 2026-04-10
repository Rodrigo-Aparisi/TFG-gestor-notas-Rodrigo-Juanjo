import { Request, Response } from 'express';
import { pool } from '../database';
import { emailService } from '../services/emailService';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const passwordController = {
  // Solicitar recuperación de contraseña
  async requestReset(req: Request, res: Response) {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es requerido' });
    }
    
    try {
      // Verificar si el usuario existe
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE email = $1',
        [email]
      );
      
      // No revelar si el correo existe o no por seguridad
      if (userResult.rows.length === 0) {
        return res.status(200).json({ 
          message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña'
        });
      }
      
      const user = userResult.rows[0];
      
      // Generar token aleatorio
      const resetToken = crypto.randomBytes(40).toString('hex');
      
      // Calcular expiración (1 hora)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Guardar token en la base de datos
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );
      
      // Enviar correo con el enlace
      await emailService.sendPasswordResetEmail(email, resetToken, user.username);
      
      return res.status(200).json({ 
        message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña'
      });
      
    } catch (error) {
      console.error('Error al solicitar restablecimiento de contraseña:', error);
      return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  },
  
  // Verificar token y restablecer contraseña
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    try {
      // Verificar que el token sea válido y no haya expirado
      const tokenResult = await pool.query(
        'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }

      const userId = tokenResult.rows[0].user_id;

      // Hashear la nueva contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña y marcar token como usado en una sola transacción
      // para garantizar atomicidad: si el segundo UPDATE falla, el primero se revierte
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
          [hashedPassword, userId]
        );

        await client.query(
          'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
          [token]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      return res.status(200).json({
        message: 'Contraseña actualizada correctamente'
      });

    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  },
  
  // Validar token (para verificar antes de mostrar el formulario de nueva contraseña)
  async validateToken(req: Request, res: Response) {
    const { token } = req.params;
    
    try {
      const tokenResult = await pool.query(
        'SELECT id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
        [token]
      );
      
      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ valid: false });
      }
      
      return res.status(200).json({ valid: true });
      
    } catch (error) {
      console.error('Error al validar token:', error);
      return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
  }
};
