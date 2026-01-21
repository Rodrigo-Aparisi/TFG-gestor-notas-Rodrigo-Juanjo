"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserGroupController_1 = require("../controllers/UserGroupController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const multerConfigNotes_1 = require("../config/multerConfigNotes");
const router = express_1.default.Router();
const userGroupController = new UserGroupController_1.UserGroupController();
// Middleware para todas las rutas
router.use(auth_1.authenticateToken);
// Rutas para grupos de usuarios
router.get('/', userGroupController.getUserGroups);
router.post('/', userGroupController.createUserGroup);
router.get('/:id', userGroupController.getUserGroup);
router.put('/:id', userGroupController.updateUserGroup);
router.delete('/:id', userGroupController.deleteUserGroup);
router.put('/:id/rename', auth_1.authenticateToken, userGroupController.renameUserGroup);
router.put('/:id/description', auth_1.authenticateToken, userGroupController.updateGroupDescription);
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
router.post('/:id/notes/upload-image', upload_1.upload.single('image'), multerConfigNotes_1.handleMulterError, userGroupController.uploadGroupNoteImage);
// Rutas adicionales
router.post('/:id/invite', userGroupController.inviteUserByEmail);
router.get('/:id/search-users', userGroupController.searchUsers);
router.post('/:id/leave', userGroupController.leaveGroup);
router.post('/:id/transfer-ownership', userGroupController.transferOwnership);
exports.default = router;
