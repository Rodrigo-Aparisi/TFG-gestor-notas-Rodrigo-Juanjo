"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passwordController_1 = require("../controllers/passwordController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validate_1 = require("../middleware/validate");
const user_schema_1 = require("../validation/schemas/user.schema");
const router = express_1.default.Router();
// Ruta para solicitar recuperación de contraseña (con rate limiting y validación)
router.post('/request-reset', rateLimiter_1.passwordResetLimiter, (0, validate_1.validate)(user_schema_1.requestResetSchema), passwordController_1.passwordController.requestReset);
// Ruta para validar token (sin rate limiting excesivo)
router.get('/validate-token/:token', passwordController_1.passwordController.validateToken);
// Ruta para cambiar contraseña con token (con rate limiting y validación robusta)
router.post('/reset', rateLimiter_1.passwordResetConfirmLimiter, (0, validate_1.validate)(user_schema_1.resetPasswordSchema), passwordController_1.passwordController.resetPassword);
exports.default = router;
