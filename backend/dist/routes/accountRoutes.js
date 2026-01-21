"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accountController_1 = require("../controllers/accountController");
const auth_1 = require("../middleware/auth");
const multerConfigPFP_1 = require("../config/multerConfigPFP");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_1.authenticateToken);
// Rutas de perfil y cuenta
router.put('/update', auth_1.authenticateToken, (req, res) => {
    console.log('Ruta de actualización alcanzada', {
        body: req.body,
        user: req.user
    });
    return accountController_1.accountController.updateUser(req, res);
});
router.get('/profile', (req, res) => {
    return accountController_1.accountController.getProfile(req, res);
});
router.delete('/delete', (req, res) => {
    return accountController_1.accountController.deleteAccount(req, res);
});
// Rutas de configuración
router.get('/settings', (req, res) => {
    return accountController_1.accountController.getUserSettings(req, res);
});
router.put('/settings', (req, res) => {
    return accountController_1.accountController.updateUserSettings(req, res);
});
// Ruta para subir imagen de perfil
router.post('/upload-profile-image', multerConfigPFP_1.upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
        }
        return accountController_1.accountController.uploadProfileImage(req, res);
    }
    catch (error) {
        console.error('Error en la ruta de subida de imagen:', error);
        return res.status(500).json({
            error: 'Error al procesar la imagen',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
// Middleware para manejar errores
router.use((err, req, res, next) => {
    console.error('Error en las rutas de cuenta:', err);
    return res.status(500).json({
        error: 'Error interno del servidor',
        details: err instanceof Error ? err.message : 'Error desconocido'
    });
});
exports.default = router;
