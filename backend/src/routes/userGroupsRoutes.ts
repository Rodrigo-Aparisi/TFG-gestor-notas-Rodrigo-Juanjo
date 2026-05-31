import express from 'express';
import { UserGroupController } from '../controllers/UserGroupController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
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
router.get('/', asyncHandler(userGroupController.getUserGroups.bind(userGroupController)));
router.post(
  '/',
  validate(createGroupSchema),
  asyncHandler(userGroupController.createUserGroup.bind(userGroupController))
);
router.get('/:id', asyncHandler(userGroupController.getUserGroup.bind(userGroupController)));
router.put(
  '/:id',
  validate(updateGroupSchema),
  asyncHandler(userGroupController.updateUserGroup.bind(userGroupController))
);
router.delete('/:id', asyncHandler(userGroupController.deleteUserGroup.bind(userGroupController)));
router.put(
  '/:id/rename',
  validate(renameGroupSchema),
  asyncHandler(userGroupController.renameUserGroup.bind(userGroupController))
);
router.put(
  '/:id/description',
  validate(updateGroupDescriptionSchema),
  asyncHandler(userGroupController.updateGroupDescription.bind(userGroupController))
);

// Rutas para miembros de grupos
router.get(
  '/:id/members',
  asyncHandler(userGroupController.getGroupMembers.bind(userGroupController))
);
router.post(
  '/:id/members',
  validate(addGroupMemberSchema),
  asyncHandler(userGroupController.addGroupMember.bind(userGroupController))
);
router.delete(
  '/:id/members/:userId',
  asyncHandler(userGroupController.removeGroupMember.bind(userGroupController))
);
router.put(
  '/:id/members/:userId/role',
  validate(updateMemberRoleSchema),
  asyncHandler(userGroupController.updateMemberRole.bind(userGroupController))
);

// Rutas para notas de grupo
router.get('/:id/notes', asyncHandler(userGroupController.getGroupNotes.bind(userGroupController)));
router.post(
  '/:id/notes',
  asyncHandler(userGroupController.createGroupNote.bind(userGroupController))
);
router.get(
  '/:id/notes/:noteId',
  asyncHandler(userGroupController.getGroupNote.bind(userGroupController))
);
router.put(
  '/:id/notes/:noteId',
  asyncHandler(userGroupController.updateGroupNote.bind(userGroupController))
);
router.delete(
  '/:id/notes/:noteId',
  asyncHandler(userGroupController.deleteGroupNote.bind(userGroupController))
);
router.patch(
  '/:id/notes/:noteId/pin',
  asyncHandler(userGroupController.togglePinGroupNote.bind(userGroupController))
);

// Ruta para subir imágenes - usando el mismo middleware que en notesRoutes
router.post(
  '/:id/notes/upload-image',
  upload.single('image'),
  handleMulterError,
  asyncHandler(userGroupController.uploadGroupNoteImage.bind(userGroupController))
);

// Rutas adicionales
router.post(
  '/:id/invite',
  validate(inviteByEmailSchema),
  asyncHandler(userGroupController.inviteUserByEmail.bind(userGroupController))
);
router.get(
  '/:id/search-users',
  asyncHandler(userGroupController.searchUsers.bind(userGroupController))
);
router.post('/:id/leave', asyncHandler(userGroupController.leaveGroup.bind(userGroupController)));
router.post(
  '/:id/transfer-ownership',
  validate(transferOwnershipSchema),
  asyncHandler(userGroupController.transferOwnership.bind(userGroupController))
);

export default router;
