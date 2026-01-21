"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnershipSchema = exports.inviteByEmailSchema = exports.updateMemberRoleSchema = exports.addGroupMemberSchema = exports.updateGroupDescriptionSchema = exports.renameGroupSchema = exports.updateGroupSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
/**
 * Esquemas de validación para operaciones de grupos de usuarios
 */
// Schema de nombre de grupo
const groupNameSchema = zod_1.z
    .string()
    .min(1, 'El nombre del grupo es requerido')
    .max(100, 'El nombre del grupo no puede exceder 100 caracteres')
    .trim();
// Schema de descripción de grupo
const groupDescriptionSchema = zod_1.z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional();
// Schema de rol de miembro
const memberRoleSchema = zod_1.z
    .enum(['owner', 'admin', 'member'], {
    errorMap: () => ({ message: 'Rol inválido. Debe ser: owner, admin o member' })
});
/**
 * CREAR GRUPO
 */
exports.createGroupSchema = zod_1.z.object({
    name: groupNameSchema,
    description: groupDescriptionSchema
});
/**
 * ACTUALIZAR GRUPO
 */
exports.updateGroupSchema = zod_1.z.object({
    name: groupNameSchema.optional(),
    description: groupDescriptionSchema
});
/**
 * RENOMBRAR GRUPO
 */
exports.renameGroupSchema = zod_1.z.object({
    name: groupNameSchema
});
/**
 * ACTUALIZAR DESCRIPCIÓN
 */
exports.updateGroupDescriptionSchema = zod_1.z.object({
    description: zod_1.z.string().max(500, 'La descripción no puede exceder 500 caracteres')
});
/**
 * AÑADIR MIEMBRO
 */
exports.addGroupMemberSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(1, 'El nombre de usuario es requerido')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Nombre de usuario inválido'),
    role: zod_1.z
        .enum(['admin', 'member'], {
        errorMap: () => ({ message: 'Rol debe ser admin o member (owner solo puede haber uno)' })
    })
        .default('member')
});
/**
 * CAMBIAR ROL DE MIEMBRO
 */
exports.updateMemberRoleSchema = zod_1.z.object({
    role: zod_1.z
        .enum(['admin', 'member'], {
        errorMap: () => ({ message: 'Rol debe ser admin o member (no puedes cambiar owner)' })
    })
});
/**
 * INVITAR POR EMAIL
 */
exports.inviteByEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido')
});
/**
 * TRANSFERIR PROPIEDAD
 */
exports.transferOwnershipSchema = zod_1.z.object({
    newOwnerId: zod_1.z.string().uuid('ID de usuario inválido')
});
