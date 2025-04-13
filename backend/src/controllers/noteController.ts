import { Request, Response } from 'express';
import { pool } from '../config/database';

export class NoteController {
  // Crear una nueva nota
  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { title, content } = req.body;
      const userId = req.user.id;

      if (!title || title.trim() === '') {
        res.status(400).json({ error: 'El título es requerido' });
        return;
      }

      // Procesar el contenido para manejar listas
      const processedContent = content.replace(/^- (.+)$/gm, '• $1')
                                    .replace(/^\* (.+)$/gm, '• $1')
                                    .replace(/^(\d+)\. (.+)$/gm, '$1. $2');

      const result = await pool.query(
        'INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
        [title, processedContent, userId]
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
        `SELECT * FROM notes 
         WHERE user_id = $1 
         ORDER BY is_pinned DESC, updated_at DESC`,
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

  async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Primero verificamos si la nota existe y pertenece al usuario
      const note = await pool.query(
        'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: 'Nota no encontrada' });
        return;
      }

      // Actualizamos el estado de is_pinned
      const result = await pool.query(
        'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar la nota' });
    }
  }

  // Método toggleMark dentro de la clase
  async toggleMark(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Primero verificamos si la nota existe y pertenece al usuario
      const note = await pool.query(
        'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: 'Nota no encontrada' });
        return;
      }

      // Actualizamos el estado de is_marked
      const result = await pool.query(
        'UPDATE notes SET is_marked = NOT is_marked WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar la nota' });
    }
  }

  // Método para desmarcar todas las notas
  async unmarkAllNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
  
      await pool.query(
        'UPDATE notes SET is_marked = false WHERE user_id = $1',
        [userId]
      );
  
      res.json({ message: 'Todas las notas han sido desmarcadas' });
    } catch (error) {
      res.status(500).json({ error: 'Error al desmarcar las notas' });
    }
  }

  // Método para eliminar múltiples notas
  async deleteMultipleNotes(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verificación y eliminación
      const { noteIds } = req.body;
      const userId = req.user.id;
      
      await client.query(
        'DELETE FROM notes WHERE id = ANY($1) AND user_id = $2',
        [noteIds, userId]
      );
      
      await client.query('COMMIT');
      res.json({ message: 'Notas eliminadas exitosamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Método para obtener notas marcadas
  async getMarkedNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 AND is_marked = true ORDER BY updated_at DESC',
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las notas marcadas' });
    }
  }

  async createGroup(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const { name, color, noteIds } = req.body;
      const userId = req.user.id;

      await client.query('BEGIN');

      // Crear el grupo
      const groupResult = await client.query(
        'INSERT INTO note_groups (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
        [name, color, userId]
      );

      const groupId = groupResult.rows[0].id;

      // Añadir notas al grupo
      if (noteIds && noteIds.length > 0) {
        const values = noteIds.map((noteId: string) => `(${groupId}, '${noteId}')`).join(',');
        await client.query(`
          INSERT INTO note_group_items (group_id, note_id) 
          VALUES ${values}
        `);
      }

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Grupo creado exitosamente',
        group: groupResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Error al crear el grupo' });
    } finally {
      client.release();
    }
  }
  
  async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT g.*, COALESCE(array_agg(ngi.note_id) FILTER (WHERE ngi.note_id IS NOT NULL), ARRAY[]::uuid[]) as note_ids
         FROM note_groups g
         LEFT JOIN note_group_items ngi ON g.id = ngi.group_id
         WHERE g.user_id = $1
         GROUP BY g.id
         ORDER BY g.created_at DESC`,
        [userId]
      );
      
      const groups = result.rows.map(group => ({
        ...group,
        id: group.id.toString(),
        note_ids: group.note_ids || []
      }));
      
      res.json({ groups });
    } catch (error) {
      console.error('Error in getGroups:', error);
      res.status(500).json({ error: 'Error al obtener los grupos' });
    }
  }

  
  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;
  
      const result = await pool.query(
        'DELETE FROM note_groups WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
  
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Grupo no encontrado' });
        return;
      }
  
      res.json({ message: 'Grupo eliminado exitosamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar el grupo' });
    }
  }

}