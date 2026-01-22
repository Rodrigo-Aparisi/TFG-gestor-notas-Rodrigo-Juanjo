"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refreshAccessToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const urlHelpers_1 = require("../utils/urlHelpers");
const errors_1 = require("../errors");
const logger_1 = require("../config/logger");
/**
 * User Registration
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        // Validations (Zod middleware handles most, this is backup)
        if (!username || !email || !password) {
            throw new errors_1.BadRequestError('Todos los campos son requeridos', 'MISSING_FIELDS');
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await database_1.pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, profile_image, created_at', [username, email, hashedPassword]);
        const userResponse = {
            ...result.rows[0],
            profile_image: (0, urlHelpers_1.getProfileImageUrl)(result.rows[0].profile_image)
        };
        logger_1.log.auth('Registro exitoso', userResponse.id, { username, email });
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: userResponse
        });
    }
    catch (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
            return next(new errors_1.BadRequestError('El usuario o correo ya existe', 'USER_EXISTS'));
        }
        next(error);
    }
};
exports.register = register;
/**
 * User Login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Validations
        if (!email || !password) {
            throw new errors_1.BadRequestError('Todos los campos son requeridos', 'MISSING_FIELDS');
        }
        const result = await database_1.pool.query('SELECT id, username, email, password, profile_image, created_at FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            throw new errors_1.NotFoundError('Correo no encontrado', 'USER_NOT_FOUND');
        }
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            logger_1.log.security('Intento de login fallido', { email, reason: 'password_incorrect' });
            throw new errors_1.UnauthorizedError('Contraseña incorrecta', 'INVALID_PASSWORD');
        }
        // Generate access token (1 hour expiration)
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Generate refresh token (7 days expiration)
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Store refresh token in database
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await database_1.pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_image: (0, urlHelpers_1.getProfileImageUrl)(user.profile_image),
            created_at: user.created_at
        };
        // Get user settings
        const settingsResult = await database_1.pool.query('SELECT theme, notifications_enabled, language FROM settings WHERE user_id = $1', [user.id]);
        const settings = settingsResult.rows[0] || {
            theme: 'dark',
            notifications_enabled: true,
            language: 'es'
        };
        logger_1.log.auth('Login exitoso', user.id, { email });
        res.json({
            success: true,
            message: 'Login exitoso',
            token: accessToken,
            refreshToken,
            user: userResponse,
            settings
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new errors_1.UnauthorizedError('Refresh token requerido', 'MISSING_REFRESH_TOKEN');
        }
        // Verify refresh token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
        }
        catch {
            throw new errors_1.ForbiddenError('Refresh token inválido', 'INVALID_REFRESH_TOKEN');
        }
        // Check if refresh token exists in database and is not expired
        const tokenResult = await database_1.pool.query('SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()', [refreshToken, decoded.id]);
        if (tokenResult.rows.length === 0) {
            throw new errors_1.ForbiddenError('Refresh token inválido o expirado', 'EXPIRED_REFRESH_TOKEN');
        }
        // Get user data
        const userResult = await database_1.pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Usuario no encontrado', 'USER_NOT_FOUND');
        }
        const user = userResult.rows[0];
        // Generate new access token
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        logger_1.logger.debug('Token renovado', { userId: user.id });
        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            token: newAccessToken
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshAccessToken = refreshAccessToken;
/**
 * User Logout
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        // Revoke access token (add to blacklist)
        if (token) {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp && decoded.id) {
                const expiresAt = new Date(decoded.exp * 1000);
                await database_1.pool.query('INSERT INTO revoked_tokens (token, user_id, expires_at, reason) VALUES ($1, $2, $3, $4)', [token, decoded.id, expiresAt, 'logout']);
            }
        }
        // Delete refresh token from database
        if (refreshToken) {
            await database_1.pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }
        logger_1.log.auth('Logout exitoso', req.user?.id);
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
