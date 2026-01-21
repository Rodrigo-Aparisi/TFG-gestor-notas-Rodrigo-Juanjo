"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestResetSchema = exports.resetPasswordSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
/**
 * Esquemas de validación para operaciones de usuario
 *
 * IMPORTANTE: La validación de contraseñas robustas SOLO se aplica en:
 * - Registro de nuevos usuarios
 * - Cambio de contraseña (voluntario)
 * - Reset de contraseña
 *
 * NO se aplica en login para mantener compatibilidad con usuarios existentes
 */
// Schema de contraseña robusta para nuevos usuarios
const strongPasswordSchema = zod_1.z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe incluir al menos un número');
// Schema básico de contraseña para login (acepta cualquier longitud)
// Esto permite que usuarios existentes con contraseñas de 6 chars sigan entrando
const basicPasswordSchema = zod_1.z
    .string()
    .min(1, 'La contraseña es requerida');
// Schema de email
const emailSchema = zod_1.z
    .string()
    .email('Formato de email inválido')
    .min(1, 'El email es requerido');
// Schema de username
const usernameSchema = zod_1.z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos');
/**
 * REGISTRO - Requiere contraseña robusta
 */
exports.registerSchema = zod_1.z.object({
    username: usernameSchema,
    email: emailSchema,
    password: strongPasswordSchema
});
/**
 * LOGIN - NO requiere contraseña robusta
 * Permite que usuarios existentes con contraseñas débiles puedan entrar
 */
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: basicPasswordSchema
});
/**
 * ACTUALIZAR USUARIO - Contraseña robusta solo si cambia
 */
exports.updateUserSchema = zod_1.z.object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    currentPassword: zod_1.z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: strongPasswordSchema.optional()
}).refine(data => {
    // Si se proporciona newPassword, debe cumplir requisitos
    if (data.newPassword) {
        return true; // Ya validado por strongPasswordSchema
    }
    return true;
}, {
    message: 'Si cambias la contraseña, debe cumplir los requisitos de seguridad'
});
/**
 * CAMBIAR CONTRASEÑA - Requiere contraseña robusta
 */
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: basicPasswordSchema, // No validamos la actual (puede ser débil)
    newPassword: strongPasswordSchema // La nueva SÍ debe ser robusta
});
/**
 * RESET CONTRASEÑA - Requiere contraseña robusta
 */
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token de reset requerido'),
    newPassword: strongPasswordSchema
});
/**
 * REQUEST RESET - Solo email
 */
exports.requestResetSchema = zod_1.z.object({
    email: emailSchema
});
