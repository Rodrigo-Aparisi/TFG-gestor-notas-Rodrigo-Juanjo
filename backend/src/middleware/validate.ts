import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, ZodTypeAny, ZodError } from 'zod';

type ValidatableSchema = AnyZodObject | ZodEffects<ZodTypeAny>;

/**
 * Middleware genérico de validación usando Zod
 *
 * Valida el body de la request contra un schema de Zod
 * Si la validación falla, retorna errores descriptivos
 */
export const validate = (schema: ValidatableSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar el body contra el schema
      await schema.parseAsync(req.body);

      // Si la validación es exitosa, continuar
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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

/**
 * Middleware de validación para parámetros de URL
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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

/**
 * Middleware de validación para query strings
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
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
