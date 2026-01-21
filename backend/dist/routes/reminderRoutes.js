"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reminderController_1 = require("../controllers/reminderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Middleware de autenticación
router.use(auth_1.authenticateToken);
// Middleware para logging de requests (ayuda en debugging)
router.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`, {
        body: req.body,
        query: req.query,
        params: req.params
    });
    next();
});
// Rutas para recordatorios
router.get('/', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.getReminders(req, res);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.createReminder(req, res);
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id/status', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.updateReminderStatus(req, res);
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.updateReminder(req, res);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.deleteReminder(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Middleware de manejo de errores
router.use((error, req, res, next) => {
    console.error('Error en rutas de recordatorios:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message
    });
});
router.get('/search', async (req, res, next) => {
    try {
        await reminderController_1.reminderController.searchReminders(req, res);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
