import { z } from 'zod';

/**
 * Esquemas de validación para operaciones de grupos de usuarios
 */

// Schema de nombre de grupo
const groupNameSchema = z
  .string()
  .min(1, 'El nombre del grupo es requerido')
  .max(100, 'El nombre del grupo no puede exceder 100 caracteres')
  .trim();

// Schema de descripción de grupo
const groupDescriptionSchema = z
  .string()
  .max(500, 'La descripción no puede exceder 500 caracteres')
  .optional();

// Schema de rol de miembro
const memberRoleSchema = z.enum(['owner', 'admin', 'member'], {
  errorMap: () => ({ message: 'Rol inválido. Debe ser: owner, admin o member' }),
});

/**
 * CREAR GRUPO
 */
export const createGroupSchema = z
  .object({
    name: groupNameSchema,
    description: groupDescriptionSchema,
  })
  .strict();

/**
 * ACTUALIZAR GRUPO
 */
export const updateGroupSchema = z
  .object({
    name: groupNameSchema.optional(),
    description: groupDescriptionSchema,
  })
  .strict();

/**
 * RENOMBRAR GRUPO
 */
export const renameGroupSchema = z
  .object({
    name: groupNameSchema,
  })
  .strict();

/**
 * ACTUALIZAR DESCRIPCIÓN
 */
export const updateGroupDescriptionSchema = z
  .object({
    description: z.string().max(500, 'La descripción no puede exceder 500 caracteres'),
  })
  .strict();

/**
 * AÑADIR MIEMBRO
 */
export const addGroupMemberSchema = z
  .object({
    username: z
      .string()
      .min(1, 'El nombre de usuario es requerido')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Nombre de usuario inválido'),
    role: z
      .enum(['admin', 'member'], {
        errorMap: () => ({ message: 'Rol debe ser admin o member (owner solo puede haber uno)' }),
      })
      .default('member'),
  })
  .strict();

/**
 * CAMBIAR ROL DE MIEMBRO
 */
export const updateMemberRoleSchema = z
  .object({
    role: z.enum(['admin', 'member'], {
      errorMap: () => ({ message: 'Rol debe ser admin o member (no puedes cambiar owner)' }),
    }),
  })
  .strict();

/**
 * INVITAR POR EMAIL
 */
export const inviteByEmailSchema = z
  .object({
    email: z.string().email('Email inválido'),
  })
  .strict();

/**
 * TRANSFERIR PROPIEDAD
 */
export const transferOwnershipSchema = z
  .object({
    newOwnerId: z.string().uuid('ID de usuario inválido'),
  })
  .strict();

// Types inferidos
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;
export type UpdateGroupDescriptionInput = z.infer<typeof updateGroupDescriptionSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type InviteByEmailInput = z.infer<typeof inviteByEmailSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
