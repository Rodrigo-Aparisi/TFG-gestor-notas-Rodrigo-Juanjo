import { Request, Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import { QueryResult } from 'pg';

export const accountController = {
    updateUser: async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('1. Request user:', req.user);
            const userId = req.user.id;
            console.log('2. User ID extraído:', userId);
            console.log('3. Datos recibidos del cliente:', req.body);

            const { username, email, currentPassword, newPassword } = req.body;

            // Verificar si el usuario existe
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            console.log('4. Query a ejecutar:', userQuery);
            console.log('5. Params de la query:', [userId]);

            const userResult: QueryResult = await pool.query(userQuery, [userId]);
            console.log('6. Resultado de la búsqueda:', {
                encontrado: userResult.rows.length > 0,
                filas: userResult.rows.length
            });

            if (userResult.rows.length === 0) {
                console.log('7. Usuario no encontrado en la base de datos');
                res.status(404).json({
                    error: 'Usuario no encontrado',
                    debugInfo: {
                        userId,
                        requestUser: req.user
                    }
                });
                return;
            }

            const user = userResult.rows[0];
            console.log('8. Usuario encontrado:', {
                id: user.id,
                username: user.username,
                email: user.email
            });

            // Verificar la contraseña actual
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            console.log('9. Contraseña válida:', isPasswordValid);

            if (!isPasswordValid) {
                res.status(401).json({ error: 'Contraseña actual incorrecta' });
                return;
            }

            // Preparar la consulta de actualización
            let query = 'UPDATE users SET username = $1, email = $2';
            let values = [username, email];

            if (newPassword) {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                query += ', password = $3';
                values.push(hashedPassword);
            }

            query += ', updated_at = NOW() WHERE id = $' + (values.length + 1) + ' RETURNING id, username, email';
            values.push(userId);

            console.log('10. Query de actualización:', {
                query,
                values: values.map((v, i) => `$${i + 1}: ${v}`)
            });

            const result: QueryResult = await pool.query(query, values);
            console.log('11. Resultado de la actualización:', result.rows[0]);

            res.json({
                message: 'Usuario actualizado exitosamente',
                user: result.rows[0]
            });
        } catch (error) {
            console.error('ERROR COMPLETO:', error);
            res.status(500).json({
                error: 'Error al actualizar el usuario',
                details: error instanceof Error ? error.message : 'Error desconocido',
                debugInfo: {
                    user: req.user,
                    body: req.body
                }
            });
        }
    },

    getProfile: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user.id;

            const result: QueryResult = await pool.query(
                'SELECT id, username, email, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }

            res.json({ user: result.rows[0] });
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ error: 'Error al obtener el perfil del usuario' });
        }
    },

    deleteAccount: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user.id;
            const { password } = req.body;

            const userResult: QueryResult = await pool.query(
                'SELECT * FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }

            const user = userResult.rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                res.status(401).json({ error: 'Contraseña incorrecta' });
                return;
            }

            await pool.query('DELETE FROM users WHERE id = $1', [userId]);

            res.json({ message: 'Cuenta eliminada exitosamente' });
        } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            res.status(500).json({ error: 'Error al eliminar la cuenta' });
        }
    }
};
