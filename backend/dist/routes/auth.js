"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Public routes with rate limiting
router.post('/register', rateLimiter_1.registerLimiter, validation_1.validateRegister, auth_controller_1.register);
router.post('/login', rateLimiter_1.loginLimiter, auth_controller_1.login);
router.post('/refresh', auth_controller_1.refreshAccessToken);
// Protected routes
router.post('/logout', auth_1.authenticateToken, auth_controller_1.logout);
exports.default = router;
