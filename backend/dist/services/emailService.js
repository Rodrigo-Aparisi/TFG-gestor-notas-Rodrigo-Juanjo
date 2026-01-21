"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../database");
// Configuración del transporte de correo
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});
// Cargar plantillas
const reminderHtmlTemplate = fs_1.default.readFileSync(path_1.default.join(__dirname, '../templates/emails/reminder.ejs'), 'utf8');
const reminderTextTemplate = fs_1.default.readFileSync(path_1.default.join(__dirname, '../templates/emails/reminder.txt.ejs'), 'utf8');
exports.emailService = {
    // Función existente para recordatorios
    async sendReminderEmail(userId, reminderTitle, reminderDescription, reminderDateTime) {
        try {
            // Obtener información del usuario
            const userResult = await database_1.pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);
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
            const htmlEmail = ejs_1.default.render(reminderHtmlTemplate, {
                reminder: reminderData,
                process: { env: process.env }
            });
            const textEmail = ejs_1.default.render(reminderTextTemplate, {
                reminder: reminderData,
                process: { env: process.env }
            });
            // Generar asunto del correo
            const subject = `Recordatorio: ${reminderTitle}`;
            // Configurar el correo
            const mailOptions = {
                from: `"Olympus Scribe" <${process.env.EMAIL_USER}>`,
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
        }
        catch (error) {
            console.error('Error al enviar correo de recordatorio:', error);
            return false;
        }
    },
    // Nueva función para enviar correos de contacto sin autenticación
    async sendContactEmail(name, email, message) {
        try {
            console.log('Enviando correo de contacto desde:', email);
            // Construir el asunto y cuerpo del correo
            const subject = `Mensaje de contacto de ${name}`;
            const textBody = `
        Nombre: ${name}
        Email: ${email}
        
        Mensaje:
        ${message}
      `;
            // Configurar el correo - enviamos al EMAIL_USER configurado en las variables de entorno
            const mailOptions = {
                from: `"Formulario de Contacto" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, // Enviar al correo configurado
                replyTo: email, // Para que puedan responder directamente al remitente
                subject: subject,
                text: textBody
            };
            // Enviar el correo
            const info = await transporter.sendMail(mailOptions);
            console.log(`Correo de contacto enviado a ${process.env.EMAIL_USER}`);
            console.log('ID del mensaje:', info.messageId);
            return true;
        }
        catch (error) {
            console.error('Error al enviar correo de contacto:', error);
            return false;
        }
    },
    // Función para enviar correo de recuperación de contraseña
    async sendPasswordResetEmail(email, resetToken, username) {
        try {
            const resetLink = `${process.env.APP_URL}/reset-password/${resetToken}`;
            const subject = 'Recuperación de contraseña - Olympus Scribe';
            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Recuperación de contraseña</h2>
          <p>Hola ${username},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <p><a href="${resetLink}" style="display: inline-block; background-color: #ffc600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Restablecer contraseña</a></p>
          <p>O copia y pega el siguiente enlace en tu navegador:</p>
          <p>${resetLink}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p>Saludos,<br>Equipo de Olympus Scribe</p>
        </div>
      `;
            const textContent = `
        Recuperación de contraseña
        
        Hola ${username},
        
        Has solicitado restablecer tu contraseña. Para crear una nueva contraseña, visita el siguiente enlace:
        
        ${resetLink}
        
        Este enlace expirará en 1 hora.
        
        Si no solicitaste este cambio, puedes ignorar este correo.
        
        Saludos,
        Equipo de Olympus Scribe
      `;
            const mailOptions = {
                from: `"Olympus Scribe" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };
            const info = await transporter.sendMail(mailOptions);
            console.log(`Correo de recuperación enviado a: ${email}`);
            console.log('ID del mensaje:', info.messageId);
            return true;
        }
        catch (error) {
            console.error('Error al enviar correo de recuperación:', error);
            return false;
        }
    }
};
