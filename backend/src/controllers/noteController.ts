import { Request, Response } from 'express';
import { pool } from '../config/database';

export class NoteController {
  // Crear una nueva nota
  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { title, content } = req.body;
      const userId = req.user.id; // Obtenido del token JWT

      const result = await pool.query(
        'INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
        [title, content, userId]
      );

      res.status(201).json({
        message: 'Nota creada exitosamente',
        note: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al crear la nota' });
    }
  }

  // Obtener todas las notas del usuario
  async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las notas' });
    }
  }

  // Actualizar una nota
  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content } = req.body;
      const userId = req.user.id;
  
      // Primero verifico si la nota existe y pertenece al usuario
      const noteExists = await pool.query(
        'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
  
      if (noteExists.rows.length === 0) {
        res.status(404).json({ error: 'Nota no encontrada' });
        return;
      }
  
      // Realizo la actualización
      const result = await pool.query(
        'UPDATE notes SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
        [title || noteExists.rows[0].title, content || noteExists.rows[0].content, id, userId]
      );
  
      res.status(200).json({
        message: 'Nota actualizada exitosamente',
        note: result.rows[0]
      });
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      res.status(500).json({ 
        error: 'Error al actualizar la nota',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar una nota
  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Nota no encontrada' });
        return;
      }

      res.json({ message: 'Nota eliminada exitosamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar la nota' });
    }
  }
}