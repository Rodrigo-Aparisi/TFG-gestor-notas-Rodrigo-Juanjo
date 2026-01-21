"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordController = void 0;
const database_1 = require("../../database");
const emailService_1 = require("../services/emailService");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
exports.passwordController = {
    // Solicitar recuperación de contraseña
    async requestReset(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'El correo electrónico es requerido' });
        }
        try {
            // Verificar si el usuario existe
            const userResult = await database_1.pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
            // No revelar si el correo existe o no por seguridad
            if (userResult.rows.length === 0) {
                return res.status(200).json({
                    message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña'
                });
            }
            const user = userResult.rows[0];
            // Generar token aleatorio
            const resetToken = crypto_1.default.randomBytes(40).toString('hex');
            // Calcular expiración (1 hora)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            // Guardar token en la base de datos
            await database_1.pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, resetToken, expiresAt]);
            // Enviar correo con el enlace
            await emailService_1.emailService.sendPasswordResetEmail(email, resetToken, user.username);
            return res.status(200).json({
                message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña'
            });
        }
        catch (error) {
            console.error('Error al solicitar restablecimiento de contraseña:', error);
            return res.status(500).json({ error: 'Error al procesar la solicitud' });
        }
    },
    // Verificar token y restablecer contraseña
    async resetPassword(req, res) {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        try {
            // Verificar que el token sea válido y no haya expirado
            const tokenResult = await database_1.pool.query('SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE', [token]);
            if (tokenResult.rows.length === 0) {
                return res.status(400).json({ error: 'Token inválido o expirado' });
            }
            const userId = tokenResult.rows[0].user_id;
            // Hashear la nueva contraseña
            const saltRounds = 10;
            const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
            // Actualizar la contraseña del usuario
            await database_1.pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
            // Marcar el token como usado
            await database_1.pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
            return res.status(200).json({
                message: 'Contraseña actualizada correctamente'
            });
        }
        catch (error) {
            console.error('Error al restablecer contraseña:', error);
            return res.status(500).json({ error: 'Error al procesar la solicitud' });
        }
    },
    // Validar token (para verificar antes de mostrar el formulario de nueva contraseña)
    async validateToken(req, res) {
        const { token } = req.params;
        try {
            const tokenResult = await database_1.pool.query('SELECT id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE', [token]);
            if (tokenResult.rows.length === 0) {
                return res.status(400).json({ valid: false });
            }
            return res.status(200).json({ valid: true });
        }
        catch (error) {
            console.error('Error al validar token:', error);
            return res.status(500).json({ error: 'Error al procesar la solicitud' });
        }
    }
};
