"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
const validateRegister = (req, res, next) => {
    const { username, email, password } = req.body;
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Email inválido' });
        return;
    }
    // Validar contraseña
    if (password.length < 6) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        return;
    }
    // Validar username
    if (username.length < 3) {
        res.status(400).json({ error: 'El username debe tener al menos 3 caracteres' });
        return;
    }
    next();
};
exports.validateRegister = validateRegister;
