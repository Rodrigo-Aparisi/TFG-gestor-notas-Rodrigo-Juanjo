"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const noteController_1 = require("../controllers/noteController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const multerConfigNotes_1 = require("../config/multerConfigNotes");
const router = express_1.default.Router();
const noteController = new noteController_1.NoteController();
router.use(auth_1.authenticateToken);
// Rutas de notas
router.post('/', noteController.createNote);
router.get('/', noteController.getNotes);
router.put('/:id', noteController.updateNote);
router.post('/share', noteController.shareNote);
router.get('/shared-notes', noteController.getSharedNotes);
router.post('/upload-image', upload_1.upload.single('image'), noteController.uploadNoteImage);
router.delete('/:id', noteController.deleteNote);
router.patch('/:id/pin', noteController.togglePin);
router.patch('/:id/mark', noteController.toggleMark);
router.post('/unmark-all', noteController.unmarkAllNotes);
router.get('/users', auth_1.authenticateToken, noteController.searchUsers);
// Nuevas rutas para permisos de edición
router.put('/:id/share-permissions', noteController.updateSharedNotePermissions);
router.put('/shared-notes/:id', auth_1.authenticateToken, noteController.updateSharedNote);
//Rutas de la papelera
router.get('/trash', noteController.getTrashNotes);
router.post('/trash/:id/restore', noteController.restoreNote);
router.delete('/trash/empty', noteController.emptyTrash);
// Rutas para preferencias de ordenación
router.get('/sort-preferences', noteController.getUserSortPreferences);
router.post('/sort-preferences', noteController.saveUserSortPreferences);
router.post('/upload-image', auth_1.authenticateToken, upload_1.upload.single('image'), multerConfigNotes_1.handleMulterError, noteController.uploadNoteImage);
exports.default = router;
