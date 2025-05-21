import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/database';

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // Clave de aplicación de Gmail
  }
});

// Cargar plantillas
const reminderHtmlTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/emails/reminder.ejs'),
  'utf8'
);
const reminderTextTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/emails/reminder.txt.ejs'),
  'utf8'
);

export const emailService = {
  async sendReminderEmail(userId: string, reminderTitle: string, reminderDescription: string, reminderDateTime: Date): Promise<boolean> {
    try {
      // Obtener información del usuario
      const userResult = await pool.query(
        'SELECT email, username FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0 || !userResult.rows[0].email) {
        console.error('Usuario no encontrado o sin correo electrónico');
        return false;
      }
      
      const user = userResult.rows[0];

      // Datos para la plantilla
      const reminderData = {
        title: reminderTitle,
        description: reminderDescription,
        dateTime: reminderDateTime,
        hasTime: reminderDateTime.getHours() !== 0 || reminderDateTime.getMinutes() !== 0,
        username: user.username
      };

      // Renderizar plantillas
      const htmlEmail = ejs.render(reminderHtmlTemplate, {
        reminder: reminderData,
        process: { env: process.env }
      });

      const textEmail = ejs.render(reminderTextTemplate, {
        reminder: reminderData,
        process: { env: process.env }
      });

      // Generar asunto del correo
      const subject = `Recordatorio: ${reminderTitle}`;

      // Configurar el correo
      const mailOptions = {
        from: `"Gestor de Notas" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: subject,
        text: textEmail,
        html: htmlEmail
      };

      // Enviar el correo
      const info = await transporter.sendMail(mailOptions);
      console.log(`Correo enviado a ${user.email} para el recordatorio: ${reminderTitle}`);
      console.log('ID del mensaje:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Error al enviar correo de recordatorio:', error);
      return false;
    }
  }
};
