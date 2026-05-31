import { z } from 'zod';

/**
 * Esquemas de validación para operaciones de notas
 *
 * Incluye protección anti-XSS rechazando tags peligrosos
 */

// Función helper para detectar scripts maliciosos
const containsDangerousHTML = (str: string): boolean => {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<object\b/gi,
    /<embed\b/gi,
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
};

// Schema de título (rechaza HTML malicioso)
const titleSchema = z
  .string()
  .min(1, 'El título es requerido')
  .max(200, 'El título no puede exceder 200 caracteres')
  .refine(val => !containsDangerousHTML(val), {
    message: 'El título contiene contenido no permitido',
  });

// Schema de contenido (rechaza HTML malicioso pero permite tags básicos)
const contentSchema = z
  .string()
  .max(50000, 'El contenido no puede exceder 50000 caracteres')
  .refine(val => !containsDangerousHTML(val), {
    message: 'El contenido contiene scripts o HTML no permitido',
  })
  .optional();

// Schema de color
const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de color inválido (debe ser hex: #RRGGBB)')
  .optional();

// Schema de imágenes (array de paths locales — whitelist de rutas permitidas)
const imagesSchema = z
  .array(
    z
      .string()
      .refine(
        url =>
          /^\/(note-images|uploads\/note-images|uploads\/group-note-images)\/[\w.\-]+$/.test(url),
        { message: 'URL de imagen no permitida: debe ser una imagen subida al servidor' }
      )
  )
  .max(10, 'No puedes adjuntar más de 10 imágenes')
  .optional();

/**
 * CREAR NOTA
 */
export const createNoteSchema = z
  .object({
    title: titleSchema,
    content: contentSchema,
    color: colorSchema,
    images: imagesSchema,
  })
  .strict();

/**
 * ACTUALIZAR NOTA
 */
export const updateNoteSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema,
    color: colorSchema,
    is_pinned: z.boolean().optional(),
    images: imagesSchema,
  })
  .strict();

/**
 * MOVER NOTA A GRUPO
 */
export const moveNoteToGroupSchema = z.object({
  groupId: z.string().uuid('ID de grupo inválido'),
});

/**
 * COMPARTIR NOTA
 */
export const shareNoteSchema = z.object({
  email: z.string().email('Email inválido'),
});

// Types inferidos
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type MoveNoteToGroupInput = z.infer<typeof moveNoteToGroupSchema>;
export type ShareNoteInput = z.infer<typeof shareNoteSchema>;
