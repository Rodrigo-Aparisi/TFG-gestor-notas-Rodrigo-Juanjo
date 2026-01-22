import { Request, Response } from "express";
import { pool } from "../../database";

/**
 * Controller for User Group CRUD operations
 * Handles creating, reading, updating, and deleting user groups
 */
export class UserGroupCrudController {
  // Get all user groups
  async getUserGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `
      SELECT
        ug.*,
        (ug.owner_id = $1) AS is_owner,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gm.id,
              'user_id', gm.user_id,
              'username', u.username,
              'profile_image', u.profile_image,
              'role', gm.role,
              'joined_at', gm.joined_at
            )
          ) FILTER (WHERE gm.id IS NOT NULL),
          '[]'
        ) AS members
      FROM user_groups ug
      JOIN group_members gm ON ug.id = gm.group_id
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = $1
      )
      GROUP BY ug.id
      ORDER BY ug.created_at DESC
    `,
        [userId]
      );

      const groups = result.rows || [];
      res.json({ groups });
    } catch (error) {
      console.error("Error al obtener grupos de usuario:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los grupos", groups: [] });
    }
  }

  // Create a new user group
  async createUserGroup(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { name, description } = req.body;
      const ownerId = req.user.id;

      if (!name || name.trim() === "") {
        res.status(400).json({ error: "El nombre del grupo es obligatorio" });
        return;
      }

      // Create the group
      const createGroupResult = await client.query(
        `
        INSERT INTO user_groups (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [name, description, ownerId]
      );

      const group = createGroupResult.rows[0];
      const groupId = group.id;

      // Add creator as member with 'owner' role
      await client.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [groupId, ownerId, "owner"]
      );

      // Get member information for response
      const memberResult = await client.query(
        `
        SELECT
          gm.id,
          gm.user_id,
          u.username,
          u.profile_image,
          gm.role,
          gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.user_id = $2
      `,
        [groupId, ownerId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Grupo creado exitosamente",
        group: {
          ...group,
          is_owner: true,
          members: memberResult.rows,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al crear grupo de usuarios:", error);
      res.status(500).json({ error: "Error al crear el grupo" });
    } finally {
      client.release();
    }
  }

  // Get a specific group
  async getUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verify user is a member of the group
      const memberCheckResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, userId]
      );

      const isMember = memberCheckResult.rows[0].is_member;

      if (!isMember) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      // Get group information with members
      const result = await pool.query(
        `
        SELECT
          ug.*,
          (ug.owner_id = $2) AS is_owner,
          COALESCE(
            json_agg(
              json_build_object(
                'id', gm.id,
                'user_id', gm.user_id,
                'username', u.username,
                'profile_image', u.profile_image,
                'role', gm.role,
                'joined_at', gm.joined_at
              )
            ) FILTER (WHERE gm.id IS NOT NULL),
            '[]'
          ) AS members
        FROM user_groups ug
        LEFT JOIN group_members gm ON ug.id = gm.group_id
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE ug.id = $1
        GROUP BY ug.id
      `,
        [groupId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({ group: result.rows[0] });
    } catch (error) {
      console.error("Error al obtener grupo:", error);
      res.status(500).json({ error: "Error al obtener el grupo" });
    }
  }

  // Update a group
  async updateUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { name, description } = req.body;

      // Verify user is owner or admin
      const roleCheckResult = await pool.query(
        `
        SELECT role FROM group_members
        WHERE group_id = $1 AND user_id = $2
      `,
        [groupId, userId]
      );

      if (roleCheckResult.rows.length === 0) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        res
          .status(403)
          .json({ error: "No tienes permisos para actualizar este grupo" });
        return;
      }

      // Update the group
      const updateResult = await pool.query(
        `
        UPDATE user_groups
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
        [name, description, groupId]
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({
        message: "Grupo actualizado exitosamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      console.error("Error al actualizar grupo:", error);
      res.status(500).json({ error: "Error al actualizar el grupo" });
    }
  }

  // Delete a group
  async deleteUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verify user is the owner
      const ownerCheckResult = await pool.query(
        `
        SELECT owner_id FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (ownerCheckResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      if (ownerCheckResult.rows[0].owner_id !== userId) {
        res
          .status(403)
          .json({ error: "Solo el propietario puede eliminar el grupo" });
        return;
      }

      // Delete the group (cascade deletes handle members and notes)
      await pool.query(
        `
        DELETE FROM user_groups
        WHERE id = $1
      `,
        [groupId]
      );

      res.json({ message: "Grupo eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar grupo:", error);
      res.status(500).json({ error: "Error al eliminar el grupo" });
    }
  }

  // Rename a group
  async renameUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { name } = req.body;

      // Validate new name is not empty
      if (!name || name.trim() === "") {
        res
          .status(400)
          .json({ error: "El nombre del grupo no puede estar vacío" });
        return;
      }

      // Verify user is owner or admin
      const roleCheckResult = await pool.query(
        `
      SELECT role FROM group_members
      WHERE group_id = $1 AND user_id = $2
    `,
        [groupId, userId]
      );

      if (roleCheckResult.rows.length === 0) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        res.status(403).json({
          error: "No tienes permisos para cambiar el nombre de este grupo",
        });
        return;
      }

      // Update group name
      const updateResult = await pool.query(
        `
      UPDATE user_groups
      SET name = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
        [name, groupId]
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({
        success: true,
        message: "Nombre del grupo actualizado correctamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      console.error("Error al cambiar el nombre del grupo:", error);
      res.status(500).json({ error: "Error al cambiar el nombre del grupo" });
    }
  }

  // Update group description
  async updateGroupDescription(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { description } = req.body;

      // Validate description is defined (can be empty but must be defined)
      if (description === undefined) {
        res.status(400).json({ error: "La descripción es obligatoria" });
        return;
      }

      // Verify user is owner or admin
      const roleCheckResult = await pool.query(
        `
      SELECT role FROM group_members
      WHERE group_id = $1 AND user_id = $2
    `,
        [groupId, userId]
      );

      if (roleCheckResult.rows.length === 0) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        res.status(403).json({
          error: "No tienes permisos para cambiar la descripción de este grupo",
        });
        return;
      }

      // Update group description
      const updateResult = await pool.query(
        `
      UPDATE user_groups
      SET description = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
        [description, groupId]
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({
        success: true,
        message: "Descripción del grupo actualizada correctamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      console.error("Error al cambiar la descripción del grupo:", error);
      res
        .status(500)
        .json({ error: "Error al cambiar la descripción del grupo" });
    }
  }
}
