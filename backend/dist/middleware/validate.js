"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateParams = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Middleware genérico de validación usando Zod
 *
 * Valida el body de la request contra un schema de Zod
 * Si la validación falla, retorna errores descriptivos
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validar el body contra el schema
            await schema.parseAsync(req.body);
            // Si la validación es exitosa, continuar
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Formatear errores de Zod de forma legible
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                // Crear mensaje de error descriptivo
                const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('\n');
                return res.status(400).json({
                    error: 'Validación fallida',
                    details: errorMessage,
                    errors: errors
                });
            }
            // Error inesperado
            console.error('Error en validación:', error);
            return res.status(500).json({
                error: 'Error al validar datos'
            });
        }
    };
};
exports.validate = validate;
/**
 * Middleware de validación para parámetros de URL
 */
const validateParams = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: 'Parámetros inválidos',
                    errors: errors
                });
            }
            return res.status(500).json({
                error: 'Error al validar parámetros'
            });
        }
    };
};
exports.validateParams = validateParams;
/**
 * Middleware de validación para query strings
 */
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: 'Query inválida',
                    errors: errors
                });
            }
            return res.status(500).json({
                error: 'Error al validar query'
            });
        }
    };
};
exports.validateQuery = validateQuery;
