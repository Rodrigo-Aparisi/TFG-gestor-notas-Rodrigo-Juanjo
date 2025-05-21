import nodemailer from 'nodemailer';
import * as nodeSchedule from 'node-schedule';  // Importación correcta
import { pool } from '../config/database';

// Interfaz para los datos de recordatorio
interface ReminderData {
  id: string;
  title: string;
  description?: string;
  dateTime: Date;
  hasTime: boolean;
  emailNotification: boolean;
  userEmail: string;
  username: string;
}

export class EmailService {
  // Inicializar la propiedad para evitar el error TS2564
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized: boolean = false;
  
  constructor() {
    this.initializeTransporter();
    this.scheduleJobs();
  }
  
  private async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // Verificar la configuración
      const verification = await this.transporter.verify();
      if (verification) {
        console.log('✅ Servicio de email inicializado correctamente');
        this.isInitialized = true;
      } else {
        console.error('❌ Error al verificar la configuración de email');
      }
    } catch (error) {
      console.error('❌ Error al inicializar el servicio de email:', error);
    }
  }
  
  private scheduleJobs() {
    // Comprobar recordatorios cada hora - usar nodeSchedule.scheduleJob en lugar de schedule
    nodeSchedule.scheduleJob('0 * * * *', async () => {
      console.log(`[${new Date().toISOString()}] Ejecutando comprobación de recordatorios...`);
      await this.checkUpcomingReminders();
    });
    
    // También ejecutar una comprobación inicial al arrancar
    setTimeout(async () => {
      await this.checkUpcomingReminders();
    }, 5000); // Esperar 5 segundos para asegurarse de que todo está inicializado
  }
  
  public async checkUpcomingReminders() {
    if (!this.isInitialized || !this.transporter) {
      console.log('Servicio de email no inicializado. Intentando inicializar...');
      await this.initializeTransporter();
      if (!this.isInitialized || !this.transporter) {
        console.error('No se pudo inicializar el servicio de email. Abortando comprobación.');
        return;
      }
    }
    
    try {
      console.log('Buscando recordatorios próximos...');
      
      // Obtener la fecha y hora actual
      const now = new Date();
      
      // Buscar recordatorios con notificación por email
      const query = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.date_time as "dateTime",
          r.has_time as "hasTime",
          r.email_notification as "emailNotification",
          u.email as "userEmail",
          u.username
        FROM reminders r
        JOIN users u ON r.user_id = u.id
        WHERE 
          r.email_notification = true 
          AND r.status_id = 1
          AND NOT EXISTS (
            SELECT 1 FROM email_logs 
            WHERE reminder_id = r.id AND status = 'sent'
          )
      `;
      
      const result = await pool.query(query);
      console.log(`Encontrados ${result.rows.length} recordatorios con notificación por email pendiente`);
      
      // Procesar cada recordatorio
      for (const reminder of result.rows) {
        await this.processReminder(reminder);
      }
      
    } catch (error) {
      console.error('Error al comprobar recordatorios:', error);
    }
  }
  
  private async processReminder(reminder: ReminderData) {
    try {
      const reminderDate = new Date(reminder.dateTime);
      const now = new Date();
      
      // Determinar si debemos enviar el email ahora
      let shouldSendNow = false;
      
      if (reminder.hasTime) {
        // Para recordatorios con hora: enviar 1 hora antes
        const oneHourBefore = new Date(reminderDate);
        oneHourBefore.setHours(oneHourBefore.getHours() - 1);
        
        // Si estamos entre ahora y 5 minutos después de la hora de envío
        if (oneHourBefore <= now && now <= new Date(oneHourBefore.getTime() + 5 * 60000)) {
          shouldSendNow = true;
        }
      } else {
        // Para recordatorios sin hora: enviar el día anterior a las 9:00 AM
        const dayBefore = new Date(reminderDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(9, 0, 0, 0);
        
        // Si estamos en el mismo día que el día anterior y entre las 9:00 AM y las 9:05 AM
        const isSameDay = 
          now.getFullYear() === dayBefore.getFullYear() &&
          now.getMonth() === dayBefore.getMonth() &&
          now.getDate() === dayBefore.getDate();
        
        const isRightTime = 
          now.getHours() === 9 && 
          now.getMinutes() >= 0 && 
          now.getMinutes() <= 5;
        
        if (isSameDay && isRightTime) {
          shouldSendNow = true;
        }
      }
      
      // Si no es el momento de enviar, salir
      if (!shouldSendNow) {
        return;
      }
      
      console.log(`Enviando email para recordatorio ${reminder.id} - ${reminder.title}`);
      
      // Generar el contenido del email
      const emailContent = this.generateEmailContent(reminder);
      
      // Verificar que el transporter está inicializado
      if (!this.transporter) {
        throw new Error('Transporter no inicializado');
      }
      
      // Enviar el email
      const info = await this.transporter.sendMail({
        from: `"Sistema de Recordatorios" <${process.env.EMAIL_USER}>`,
        to: reminder.userEmail,
        subject: `Recordatorio: ${reminder.title}`,
        text: emailContent.text,
        html: emailContent.html
      });
      
      console.log(`✅ Email enviado para recordatorio ${reminder.id}, messageId: ${info.messageId}`);
      
      // Registrar el envío en la base de datos
      await this.logEmailSent(reminder.id, reminder.userEmail, info.messageId);
      
    } catch (err) {
      // Corregir el manejo del error para que TypeScript no se queje
      const error = err as Error;
      console.error(`Error al procesar recordatorio ${reminder.id}:`, error);
      
      // Registrar el error en la base de datos
      await this.logEmailError(reminder.id, reminder.userEmail, error.message || 'Error desconocido');
    }
  }
  
  private generateEmailContent(reminder: ReminderData) {
    // Formatear la fecha
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const formattedDate = new Date(reminder.dateTime).toLocaleDateString('es-ES', dateOptions);
    let formattedTime = '';
    
    if (reminder.hasTime) {
      formattedTime = new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Texto plano
    let text = `Recordatorio: ${reminder.title}\n\n`;
    text += `Hola ${reminder.username},\n\n`;
    text += `Te recordamos que tienes un evento próximamente:\n\n`;
    text += `TÍTULO: ${reminder.title}\n`;
    text += `FECHA: ${formattedDate}\n`;
    
    if (reminder.hasTime) {
      text += `HORA: ${formattedTime}\n`;
    }
    
    if (reminder.description) {
      text += `\nDESCRIPCIÓN:\n${reminder.description}\n`;
    }
    
    text += `\nSaludos,\nTu Sistema de Recordatorios`;
    
    // HTML
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
          }
          .content {
            padding: 20px 0;
          }
          .reminder-title {
            font-size: 22px;
            color: #ffd700;
            margin-bottom: 15px;
          }
          .reminder-date {
            font-size: 18px;
            color: #444;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border-left: 3px solid #ffd700;
          }
          .reminder-description {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eaeaea;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sistema de Recordatorios</h1>
          </div>
          <div class="content">
            <p>Hola ${reminder.username},</p>
            <p>Te recordamos que tienes un evento próximamente:</p>
            
            <div class="reminder-title">
              ${reminder.title}
            </div>
            
            <div class="reminder-date">
              <strong>Fecha:</strong> ${formattedDate}
              ${reminder.hasTime ? `<br><strong>Hora:</strong> ${formattedTime}` : ''}
            </div>
            
            ${reminder.description ? `
              <div class="reminder-description">
                <strong>Descripción:</strong>
                <p>${reminder.description.replace(/\n/g, '<br>')}</p>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p>&copy; ${new Date().getFullYear()} Sistema de Recordatorios. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return { text, html };
  }
  
  private async logEmailSent(reminderId: string, userEmail: string, messageId: string) {
    try {
      // Primero, verificar si ya existe una tabla email_logs
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs'
        );
      `;
      
      const tableExists = await pool.query(checkTableQuery);
      
      // Si la tabla no existe, crearla
      if (!tableExists.rows[0].exists) {
        const createTableQuery = `
          CREATE TABLE email_logs (
            id SERIAL PRIMARY KEY,
            reminder_id UUID REFERENCES reminders(id),
            user_email VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL,
            message_id VARCHAR(255),
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        await pool.query(createTableQuery);
        console.log('Tabla email_logs creada');
      }
      
      // Registrar el envío
      await pool.query(`
        INSERT INTO email_logs (reminder_id, user_email, status, message_id)
        VALUES ($1, $2, $3, $4)
      `, [reminderId, userEmail, 'sent', messageId]);
      
    } catch (error) {
      console.error('Error al registrar envío de email:', error);
    }
  }
  
  private async logEmailError(reminderId: string, userEmail: string, errorMessage: string) {
    try {
      // Verificar si existe la tabla email_logs
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs'
        );
      `;
      
      const tableExists = await pool.query(checkTableQuery);
      
      // Si la tabla no existe, crearla
      if (!tableExists.rows[0].exists) {
        const createTableQuery = `
          CREATE TABLE email_logs (
            id SERIAL PRIMARY KEY,
            reminder_id UUID REFERENCES reminders(id),
            user_email VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL,
            message_id VARCHAR(255),
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        await pool.query(createTableQuery);
        console.log('Tabla email_logs creada');
      }
      
      // Registrar el error
      await pool.query(`
        INSERT INTO email_logs (reminder_id, user_email, status, error_message)
        VALUES ($1, $2, $3, $4)
      `, [reminderId, userEmail, 'error', errorMessage]);
      
    } catch (error) {
      console.error('Error al registrar error de email:', error);
    }
  }
  
  // Método para enviar un email de prueba
  public async sendTestEmail(email: string, username: string = 'Usuario') {
    if (!this.isInitialized || !this.transporter) {
      await this.initializeTransporter();
      if (!this.isInitialized || !this.transporter) {
        throw new Error('No se pudo inicializar el servicio de email');
      }
    }
    
    try {
      const testReminder = {
        id: 'test-' + Date.now(),
        title: 'Email de prueba',
        description: 'Este es un email de prueba para verificar la configuración del sistema de recordatorios.',
        dateTime: new Date(),
        hasTime: true,
        emailNotification: true,
        userEmail: email,
        username: username
      };
      
      const emailContent = this.generateEmailContent(testReminder);
      
      const info = await this.transporter.sendMail({
        from: `"Sistema de Recordatorios" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Prueba - Recordatorio: ${testReminder.title}`,
        text: emailContent.text,
        html: emailContent.html
      });
      
      console.log(`✅ Email de prueba enviado, messageId: ${info.messageId}`);
      return info.messageId;
    } catch (err) {
      const error = err as Error;
      console.error('Error al enviar email de prueba:', error);
      throw error;
    }
  }

  public async checkUpcomingRemindersForTest() {
    if (!this.isInitialized || !this.transporter) {
      console.log('Servicio de email no inicializado. Intentando inicializar...');
      await this.initializeTransporter();
      if (!this.isInitialized || !this.transporter) {
        console.error('No se pudo inicializar el servicio de email. Abortando comprobación.');
        return;
      }
    }
    
    try {
      console.log('Buscando recordatorios para pruebas...');
      
      // Obtener la fecha y hora actual
      const now = new Date();
      
      // Buscar recordatorios con notificación por email que estén en los próximos 30 minutos
      const query = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.date_time as "dateTime",
          r.has_time as "hasTime",
          r.email_notification as "emailNotification",
          u.email as "userEmail",
          u.username
        FROM reminders r
        JOIN users u ON r.user_id = u.id
        WHERE 
          r.email_notification = true 
          AND r.status_id = 1
          AND NOT EXISTS (
            SELECT 1 FROM email_logs 
            WHERE reminder_id = r.id AND status = 'sent'
          )
          AND r.date_time > $1
          AND r.date_time < $2
      `;
      
      // Buscar recordatorios en los próximos 30 minutos
      const futureTime = new Date(now);
      futureTime.setMinutes(futureTime.getMinutes() + 30);
      
      const result = await pool.query(query, [now, futureTime]);
      console.log(`Encontrados ${result.rows.length} recordatorios para prueba`);
      
      // Procesar cada recordatorio, forzando el envío
      for (const reminder of result.rows) {
        await this.processForcedReminder(reminder);
      }
      
    } catch (error) {
      console.error('Error al comprobar recordatorios para prueba:', error);
      throw error;
    }
  }

  private async processForcedReminder(reminder: ReminderData) {
    try {
      console.log(`Forzando envío de email para recordatorio ${reminder.id} - ${reminder.title}`);
      
      // Generar el contenido del email
      const emailContent = this.generateEmailContent(reminder);
      
      // Verificar que el transporter está inicializado
      if (!this.transporter) {
        throw new Error('Transporter no inicializado');
      }
      
      // Enviar el email
      const info = await this.transporter.sendMail({
        from: `"Sistema de Recordatorios" <${process.env.EMAIL_USER}>`,
        to: reminder.userEmail,
        subject: `Recordatorio: ${reminder.title}`,
        text: emailContent.text,
        html: emailContent.html
      });
      
      console.log(`✅ Email enviado para recordatorio ${reminder.id}, messageId: ${info.messageId}`);
      
      // Registrar el envío en la base de datos
      await this.logEmailSent(reminder.id, reminder.userEmail, info.messageId);
      
      return info;
    } catch (err) {
      const error = err as Error;
      console.error(`Error al procesar recordatorio forzado ${reminder.id}:`, error);
      
      // Registrar el error en la base de datos
      await this.logEmailError(reminder.id, reminder.userEmail, error.message || 'Error desconocido');
      
      throw error;
    }
  }

}

// Crear y exportar una instancia del servicio
export const emailService = new EmailService();
