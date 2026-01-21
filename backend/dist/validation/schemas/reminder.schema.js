"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReminderStatusSchema = exports.updateReminderSchema = exports.createReminderSchema = void 0;
const zod_1 = require("zod");
/**
 * Esquemas de validación para recordatorios
 */
// Schema de título de recordatorio
const titleSchema = zod_1.z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim();
// Schema de descripción
const descriptionSchema = zod_1.z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional();
// Schema de fecha/hora
const dateTimeSchema = zod_1.z
    .string()
    .datetime({ message: 'Formato de fecha inválido (debe ser ISO 8601)' })
    .or(zod_1.z.date())
    .refine((val) => {
    const date = typeof val === 'string' ? new Date(val) : val;
    return date > new Date(); // Debe ser fecha futura
}, { message: 'La fecha del recordatorio debe ser en el futuro' });
/**
 * CREAR RECORDATORIO
 */
exports.createReminderSchema = zod_1.z.object({
    title: titleSchema,
    description: descriptionSchema,
    dateTime: dateTimeSchema,
    hasTime: zod_1.z.boolean().default(true),
    sendEmail: zod_1.z.boolean().default(false)
});
/**
 * ACTUALIZAR RECORDATORIO
 */
exports.updateReminderSchema = zod_1.z.object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    dateTime: dateTimeSchema.optional(),
    hasTime: zod_1.z.boolean().optional(),
    sendEmail: zod_1.z.boolean().optional(),
    statusId: zod_1.z.number().int().min(1).max(3).optional() // 1=pendiente, 2=completado, 3=cancelado
});
/**
 * ACTUALIZAR ESTADO
 */
exports.updateReminderStatusSchema = zod_1.z.object({
    statusId: zod_1.z
        .number()
        .int()
        .min(1, 'Status ID debe ser 1, 2 o 3')
        .max(3, 'Status ID debe ser 1, 2 o 3')
});
