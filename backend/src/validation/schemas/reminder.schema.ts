import { z } from 'zod';

/**
 * Esquemas de validación para recordatorios
 */

// Schema de título de recordatorio
const titleSchema = z
  .string()
  .min(1, 'El título es requerido')
  .max(200, 'El título no puede exceder 200 caracteres')
  .trim();

// Schema de descripción
const descriptionSchema = z
  .string()
  .max(1000, 'La descripción no puede exceder 1000 caracteres')
  .optional();

// Schema de fecha/hora
const dateTimeSchema = z
  .string()
  .datetime({ message: 'Formato de fecha inválido (debe ser ISO 8601)' })
  .or(z.date())
  .refine(
    val => {
      const date = typeof val === 'string' ? new Date(val) : val;
      return date > new Date(); // Debe ser fecha futura
    },
    { message: 'La fecha del recordatorio debe ser en el futuro' }
  );

/**
 * CREAR RECORDATORIO
 */
export const createReminderSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    dateTime: dateTimeSchema,
    hasTime: z.boolean().default(true),
    sendEmail: z.boolean().default(false),
  })
  .strict();

/**
 * ACTUALIZAR RECORDATORIO
 */
export const updateReminderSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    dateTime: dateTimeSchema.optional(),
    hasTime: z.boolean().optional(),
    sendEmail: z.boolean().optional(),
    statusId: z.number().int().min(1).max(3).optional(), // 1=pendiente, 2=completado, 3=cancelado
  })
  .strict();

/**
 * ACTUALIZAR ESTADO
 */
export const updateReminderStatusSchema = z.object({
  statusId: z
    .number()
    .int()
    .min(1, 'Status ID debe ser 1, 2 o 3')
    .max(3, 'Status ID debe ser 1, 2 o 3'),
});

// Types inferidos
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type UpdateReminderStatusInput = z.infer<typeof updateReminderStatusSchema>;
