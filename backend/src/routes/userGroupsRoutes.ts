import express from 'express';
import { UserGroupController } from '../controllers/UserGroupController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  createGroupSchema,
  updateGroupSchema,
  renameGroupSchema,
  updateGroupDescriptionSchema,
  addGroupMemberSchema,
  updateMemberRoleSchema,
  inviteByEmailSchema,
  transferOwnershipSchema,
} from '../validation/schemas/group.schema';

const router = express.Router();
const userGroupController = new UserGroupController();

// Middleware para todas las rutas
router.use(authenticateToken);

// Rutas para grupos de usuarios
router.get('/', userGroupController.getUserGroups);
router.post('/', validate(createGroupSchema), userGroupController.createUserGroup);
router.get('/:id', userGroupController.getUserGroup);
router.put('/:id', validate(updateGroupSchema), userGroupController.updateUserGroup);
router.delete('/:id', userGroupController.deleteUserGroup);
router.put('/:id/rename', validate(renameGroupSchema), userGroupController.renameUserGroup);
router.put('/:id/description', validate(updateGroupDescriptionSchema), userGroupController.updateGroupDescription);

// Rutas para miembros de grupos
router.get('/:id/members', userGroupController.getGroupMembers);
router.post('/:id/members', validate(addGroupMemberSchema), userGroupController.addGroupMember);
router.delete('/:id/members/:userId', userGroupController.removeGroupMember);
router.put('/:id/members/:userId/role', validate(updateMemberRoleSchema), userGroupController.updateMemberRole);

// Rutas para notas de grupo
router.get('/:id/notes', userGroupController.getGroupNotes);
router.post('/:id/notes', userGroupController.createGroupNote);
router.get('/:id/notes/:noteId', userGroupController.getGroupNote);
router.put('/:id/notes/:noteId', userGroupController.updateGroupNote);
router.delete('/:id/notes/:noteId', userGroupController.deleteGroupNote);
router.patch('/:id/notes/:noteId/pin', userGroupController.togglePinGroupNote);

// Ruta para subir imágenes - usando el mismo middleware que en notesRoutes
router.post(
    '/:id/notes/upload-image',
    upload.single('image'),
    handleMulterError,
    userGroupController.uploadGroupNoteImage
);

// Rutas adicionales
router.post('/:id/invite', validate(inviteByEmailSchema), userGroupController.inviteUserByEmail);
router.get('/:id/search-users', userGroupController.searchUsers);
router.post('/:id/leave', userGroupController.leaveGroup);
router.post('/:id/transfer-ownership', validate(transferOwnershipSchema), userGroupController.transferOwnership);

export default router;
