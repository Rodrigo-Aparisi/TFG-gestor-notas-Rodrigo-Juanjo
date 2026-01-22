"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteGroupController = void 0;
const database_1 = require("../../database");
/**
 * Controller for Note Group operations
 * Handles group creation, management, and note-group relationships
 */
class NoteGroupController {
    async createGroup(req, res) {
        const client = await database_1.pool.connect();
        try {
            const { name, color, noteIds } = req.body;
            const userId = req.user.id;
            await client.query("BEGIN");
            // Get max position
            const positionResult = await client.query("SELECT COALESCE(MAX(position), -1) as max_position FROM note_groups WHERE user_id = $1", [userId]);
            const nextPosition = positionResult.rows[0].max_position + 1;
            // Create group
            const groupResult = await client.query("INSERT INTO note_groups (name, color, user_id, position) VALUES ($1, $2, $3, $4) RETURNING *", [name, color, userId, nextPosition]);
            const groupId = groupResult.rows[0].id;
            // Add notes to group
            if (noteIds && noteIds.length > 0) {
                const placeholders = noteIds
                    .map((_, idx) => `($1, $${idx + 2})`)
                    .join(",");
                const values = [groupId, ...noteIds];
                await client.query(`INSERT INTO note_group_items (group_id, note_id) VALUES ${placeholders}`, values);
            }
            await client.query("COMMIT");
            const completeGroup = {
                ...groupResult.rows[0],
                note_ids: noteIds || [],
            };
            res.status(201).json({
                message: "Grupo creado exitosamente",
                group: completeGroup,
            });
        }
        catch (error) {
            await client.query("ROLLBACK");
            console.error("Error al crear el grupo:", error);
            res.status(500).json({ error: "Error al crear el grupo" });
        }
        finally {
            client.release();
        }
    }
    async getGroups(req, res) {
        try {
            const userId = req.user.id;
            const result = await database_1.pool.query(`SELECT g.*,
        COALESCE(array_agg(ngi.note_id) FILTER (WHERE ngi.note_id IS NOT NULL), ARRAY[]::uuid[]) as note_ids,
        g.position
        FROM note_groups g
        LEFT JOIN note_group_items ngi ON g.id = ngi.group_id
        WHERE g.user_id = $1
        GROUP BY g.id
        ORDER BY g.position ASC, g.created_at DESC`, [userId]);
            const groups = result.rows.map((group) => ({
                ...group,
                id: group.id.toString(),
                note_ids: group.note_ids || [],
            }));
            res.json({ groups });
        }
        catch (error) {
            console.error("Error in getGroups:", error);
            res.status(500).json({ error: "Error al obtener los grupos" });
        }
    }
    async updateGroup(req, res) {
        try {
            const { id } = req.params;
            const { name, color } = req.body;
            const userId = req.user.id;
            // Verify group exists and belongs to user
            const checkGroup = await database_1.pool.query("SELECT * FROM note_groups WHERE id = $1 AND user_id = $2", [id, userId]);
            if (checkGroup.rows.length === 0) {
                res.status(404).json({ error: "Grupo no encontrado" });
                return;
            }
            // Update group
            const result = await database_1.pool.query("UPDATE note_groups SET name = $1, color = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *", [name, color, id, userId]);
            // Get associated notes
            const notesResult = await database_1.pool.query(`SELECT note_id FROM note_group_items WHERE group_id = $1`, [id]);
            const noteIds = notesResult.rows.map((row) => row.note_id);
            res.json({
                message: "Grupo actualizado exitosamente",
                group: {
                    ...result.rows[0],
                    id: result.rows[0].id.toString(),
                    note_ids: noteIds,
                },
            });
        }
        catch (error) {
            console.error("Error al actualizar grupo:", error);
            res.status(500).json({ error: "Error al actualizar el grupo" });
        }
    }
    async addNoteToGroup(req, res) {
        try {
            const { groupId, noteId } = req.body;
            const userId = req.user.id;
            // Verify group exists and belongs to user
            const groupCheck = await database_1.pool.query("SELECT * FROM note_groups WHERE id = $1 AND user_id = $2", [groupId, userId]);
            if (groupCheck.rows.length === 0) {
                res.status(404).json({ error: "Grupo no encontrado" });
                return;
            }
            // Verify note exists and belongs to user
            const noteCheck = await database_1.pool.query("SELECT * FROM notes WHERE id = $1 AND user_id = $2", [noteId, userId]);
            if (noteCheck.rows.length === 0) {
                res.status(404).json({ error: "Nota no encontrada" });
                return;
            }
            // Check if note is already in group
            const existingCheck = await database_1.pool.query("SELECT * FROM note_group_items WHERE group_id = $1 AND note_id = $2", [groupId, noteId]);
            if (existingCheck.rows.length > 0) {
                res.status(400).json({ error: "La nota ya está en este grupo" });
                return;
            }
            // Add note to group
            await database_1.pool.query("INSERT INTO note_group_items (group_id, note_id) VALUES ($1, $2)", [groupId, noteId]);
            res.json({ message: "Nota añadida al grupo exitosamente" });
        }
        catch (error) {
            console.error("Error al añadir nota al grupo:", error);
            res.status(500).json({ error: "Error al añadir la nota al grupo" });
        }
    }
    async removeNoteFromGroup(req, res) {
        try {
            const { groupId, noteId } = req.params;
            const userId = req.user.id;
            // Verify group exists and belongs to user
            const groupCheck = await database_1.pool.query("SELECT * FROM note_groups WHERE id = $1 AND user_id = $2", [groupId, userId]);
            if (groupCheck.rows.length === 0) {
                res.status(404).json({ error: "Grupo no encontrado" });
                return;
            }
            // Remove note from group
            await database_1.pool.query("DELETE FROM note_group_items WHERE group_id = $1 AND note_id = $2", [groupId, noteId]);
            res.json({ message: "Nota eliminada del grupo exitosamente" });
        }
        catch (error) {
            console.error("Error al eliminar nota del grupo:", error);
            res.status(500).json({ error: "Error al eliminar la nota del grupo" });
        }
    }
    async reorderGroups(req, res) {
        const client = await database_1.pool.connect();
        try {
            const { groupIds } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(groupIds) || groupIds.length === 0) {
                res.status(400).json({ error: "Se requiere un array de IDs de grupos" });
                return;
            }
            await client.query("BEGIN");
            // Verify all groups belong to user
            const groupsCheck = await client.query("SELECT id FROM note_groups WHERE id = ANY($1) AND user_id = $2", [groupIds, userId]);
            if (groupsCheck.rows.length !== groupIds.length) {
                await client.query("ROLLBACK");
                res.status(400).json({
                    error: "Uno o más grupos no existen o no pertenecen al usuario",
                });
                return;
            }
            // Update positions
            for (let i = 0; i < groupIds.length; i++) {
                await client.query("UPDATE note_groups SET position = $1 WHERE id = $2 AND user_id = $3", [i, groupIds[i], userId]);
            }
            await client.query("COMMIT");
            res.json({ message: "Orden de grupos actualizado exitosamente" });
        }
        catch (error) {
            await client.query("ROLLBACK");
            console.error("Error al reordenar grupos:", error);
            res.status(500).json({
                error: "Error al reordenar los grupos",
                details: error instanceof Error ? error.message : "Error desconocido",
            });
        }
        finally {
            client.release();
        }
    }
    async deleteGroup(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const result = await database_1.pool.query("DELETE FROM note_groups WHERE id = $1 AND user_id = $2 RETURNING *", [id, userId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Grupo no encontrado" });
                return;
            }
            res.json({ message: "Grupo eliminado exitosamente" });
        }
        catch (error) {
            res.status(500).json({ error: "Error al eliminar el grupo" });
        }
    }
}
exports.NoteGroupController = NoteGroupController;
