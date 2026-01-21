"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareNoteSchema = exports.moveNoteToGroupSchema = exports.updateNoteSchema = exports.createNoteSchema = void 0;
const zod_1 = require("zod");
/**
 * Esquemas de validación para operaciones de notas
 *
 * Incluye protección anti-XSS rechazando tags peligrosos
 */
// Función helper para detectar scripts maliciosos
const containsDangerousHTML = (str) => {
    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror, etc.
        /<object\b/gi,
        /<embed\b/gi
    ];
    return dangerousPatterns.some(pattern => pattern.test(str));
};
// Schema de título (rechaza HTML malicioso)
const titleSchema = zod_1.z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres')
    .refine((val) => !containsDangerousHTML(val), { message: 'El título contiene contenido no permitido' });
// Schema de contenido (rechaza HTML malicioso pero permite tags básicos)
const contentSchema = zod_1.z
    .string()
    .max(50000, 'El contenido no puede exceder 50000 caracteres')
    .refine((val) => !containsDangerousHTML(val), { message: 'El contenido contiene scripts o HTML no permitido' })
    .optional();
// Schema de color
const colorSchema = zod_1.z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de color inválido (debe ser hex: #RRGGBB)')
    .optional();
// Schema de imágenes (array de URLs)
const imagesSchema = zod_1.z
    .array(zod_1.z.string().url('URL de imagen inválida'))
    .max(10, 'No puedes adjuntar más de 10 imágenes')
    .optional();
/**
 * CREAR NOTA
 */
exports.createNoteSchema = zod_1.z.object({
    title: titleSchema,
    content: contentSchema,
    color: colorSchema,
    images: imagesSchema
});
/**
 * ACTUALIZAR NOTA
 */
exports.updateNoteSchema = zod_1.z.object({
    title: titleSchema.optional(),
    content: contentSchema,
    color: colorSchema,
    is_pinned: zod_1.z.boolean().optional(),
    images: imagesSchema
});
/**
 * MOVER NOTA A GRUPO
 */
exports.moveNoteToGroupSchema = zod_1.z.object({
    groupId: zod_1.z.string().uuid('ID de grupo inválido')
});
/**
 * COMPARTIR NOTA
 */
exports.shareNoteSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido')
});
