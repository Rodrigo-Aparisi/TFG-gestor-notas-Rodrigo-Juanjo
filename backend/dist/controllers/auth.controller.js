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
// Función de registro
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validaciones
        if (!username || !email || !password) {
            res.status(400).json({ error: 'Todos los campos son requeridos' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await database_1.pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, profile_image, created_at', [username, email, hashedPassword]);
        // Construir URL completa de la imagen si existe
        const userResponse = {
            ...result.rows[0],
            profile_image: (0, urlHelpers_1.getProfileImageUrl)(result.rows[0].profile_image)
        };
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: userResponse
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            error: 'Error en el servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.register = register;
// Función de login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validaciones
        if (!email || !password) {
            res.status(400).json({ error: 'Todos los campos son requeridos' });
            return;
        }
        const result = await database_1.pool.query('SELECT id, username, email, password, profile_image, created_at FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            res.status(400).json({ error: 'Correo no encontrado' });
            return;
        }
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            res.status(400).json({ error: 'Contraseña incorrecta' });
            return;
        }
        // Generate access token (1 hour expiration)
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Generate refresh token (7 days expiration)
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Store refresh token in database
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        await database_1.pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
        // Construir URL completa de la imagen si existe
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            profile_image: (0, urlHelpers_1.getProfileImageUrl)(user.profile_image),
            created_at: user.created_at
        };
        // Obtener configuración del usuario
        const settingsResult = await database_1.pool.query('SELECT theme, notifications_enabled, language FROM settings WHERE user_id = $1', [user.id]);
        const settings = settingsResult.rows[0] || {
            theme: 'dark',
            notifications_enabled: true,
            language: 'es'
        };
        console.log('Login exitoso:', {
            user: userResponse,
            settings
        });
        res.json({
            message: 'Login exitoso',
            token: accessToken,
            refreshToken,
            user: userResponse,
            settings
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: 'Error en el servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.login = login;
// Función de refresh token
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(401).json({ error: 'Refresh token requerido' });
            return;
        }
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
        // Check if refresh token exists in database and is not expired
        const tokenResult = await database_1.pool.query('SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()', [refreshToken, decoded.id]);
        if (tokenResult.rows.length === 0) {
            res.status(403).json({ error: 'Refresh token inválido o expirado' });
            return;
        }
        // Get user data
        const userResult = await database_1.pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        const user = userResult.rows[0];
        // Generate new access token
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({
            message: 'Token renovado exitosamente',
            token: newAccessToken
        });
    }
    catch (error) {
        console.error('Error al renovar token:', error);
        res.status(403).json({
            error: 'Refresh token inválido',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.refreshAccessToken = refreshAccessToken;
// Función de logout
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        // Revoke access token (add to blacklist)
        if (token) {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp) {
                const expiresAt = new Date(decoded.exp * 1000);
                await database_1.pool.query('INSERT INTO revoked_tokens (token, user_id, expires_at, reason) VALUES ($1, $2, $3, $4)', [token, decoded.id, expiresAt, 'logout']);
            }
        }
        // Delete refresh token from database
        if (refreshToken) {
            await database_1.pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }
        res.json({ message: 'Logout exitoso' });
    }
    catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: 'Error en el servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.logout = logout;
