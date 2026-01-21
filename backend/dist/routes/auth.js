"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validate_1 = require("../middleware/validate");
const user_schema_1 = require("../validation/schemas/user.schema");
const router = (0, express_1.Router)();
// Public routes with rate limiting and Zod validation
router.post('/register', rateLimiter_1.registerLimiter, (0, validate_1.validate)(user_schema_1.registerSchema), auth_controller_1.register);
router.post('/login', rateLimiter_1.loginLimiter, (0, validate_1.validate)(user_schema_1.loginSchema), auth_controller_1.login);
router.post('/refresh', auth_controller_1.refreshAccessToken);
// Protected routes
router.post('/logout', auth_1.authenticateToken, auth_controller_1.logout);
exports.default = router;
