"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const noteController_1 = require("../controllers/noteController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const UserGroupController_1 = require("../controllers/UserGroupController");
const router = express_1.default.Router();
const noteController = new noteController_1.NoteController();
const userGroupController = new UserGroupController_1.UserGroupController();
router.use(auth_1.authenticateToken);
// Rutas específicas primero
router.put('/reorder', noteController.reorderGroups);
router.post('/add-note', noteController.addNoteToGroup);
// Rutas básicas de grupos después
router.get('/', noteController.getGroups);
router.post('/', noteController.createGroup);
router.put('/:id', noteController.updateGroup);
router.delete('/:id', noteController.deleteGroup);
router.post('/notes/upload-image', upload_1.upload.single('image'), userGroupController.uploadGroupNoteImage);
router.delete('/notes/:noteId/images/:imageIndex', userGroupController.deleteGroupNoteImage);
// Rutas para gestionar notas dentro de grupos
router.delete('/:groupId/notes/:noteId', noteController.removeNoteFromGroup);
exports.default = router;
