import express from 'express';
import { UserGroupController } from '../controllers/UserGroupController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { handleMulterError } from '../config/multerConfigNotes';

const router = express.Router();
const userGroupController = new UserGroupController();

// Middleware para todas las rutas
router.use(authenticateToken);

// Rutas para grupos de usuarios
router.get('/', userGroupController.getUserGroups);
router.post('/', userGroupController.createUserGroup);
router.get('/:id', userGroupController.getUserGroup);
router.put('/:id', userGroupController.updateUserGroup);
router.delete('/:id', userGroupController.deleteUserGroup);

// Rutas para miembros de grupos
router.get('/:id/members', userGroupController.getGroupMembers);
router.post('/:id/members', userGroupController.addGroupMember);
router.delete('/:id/members/:userId', userGroupController.removeGroupMember);
router.put('/:id/members/:userId/role', userGroupController.updateMemberRole);

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
router.post('/:id/invite', userGroupController.inviteUserByEmail);
router.get('/:id/search-users', userGroupController.searchUsers);
router.post('/:id/leave', userGroupController.leaveGroup);
router.post('/:id/transfer-ownership', userGroupController.transferOwnership);

export default router;