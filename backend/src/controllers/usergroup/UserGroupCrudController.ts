import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../errors/AppError";

/**
 * Controller for User Group CRUD operations
 * Handles creating, reading, updating, and deleting user groups
 */
export class UserGroupCrudController {
  // Get all user groups
  async getUserGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

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
      next(error);
    }
  }

  // Create a new user group
  async createUserGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { name, description } = req.body;
      const ownerId = req.user!.id;

      if (!name || name.trim() === "") {
        return next(new BadRequestError("El nombre del grupo es obligatorio"));
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
      next(error);
    } finally {
      client.release();
    }
  }

  // Get a specific group
  async getUserGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;

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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
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
        return next(new NotFoundError("Grupo no encontrado"));
      }

      res.json({ group: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  // Update a group
  async updateUserGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        return next(new ForbiddenError("No tienes permisos para actualizar este grupo"));
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
        return next(new NotFoundError("Grupo no encontrado"));
      }

      res.json({
        message: "Grupo actualizado exitosamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a group
  async deleteUserGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;

      // Verify user is the owner
      const ownerCheckResult = await pool.query(
        `
        SELECT owner_id FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (ownerCheckResult.rows.length === 0) {
        return next(new NotFoundError("Grupo no encontrado"));
      }

      if (ownerCheckResult.rows[0].owner_id !== userId) {
        return next(new ForbiddenError("Solo el propietario puede eliminar el grupo"));
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
      next(error);
    }
  }

  // Rename a group
  async renameUserGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
      const { name } = req.body;

      // Validate new name is not empty
      if (!name || name.trim() === "") {
        return next(new BadRequestError("El nombre del grupo no puede estar vacío"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        return next(new ForbiddenError("No tienes permisos para cambiar el nombre de este grupo"));
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
        return next(new NotFoundError("Grupo no encontrado"));
      }

      res.json({
        success: true,
        message: "Nombre del grupo actualizado correctamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  // Update group description
  async updateGroupDescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
      const { description } = req.body;

      // Validate description is defined (can be empty but must be defined)
      if (description === undefined) {
        return next(new BadRequestError("La descripción es obligatoria"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      const role = roleCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        return next(new ForbiddenError("No tienes permisos para cambiar la descripción de este grupo"));
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
        return next(new NotFoundError("Grupo no encontrado"));
      }

      res.json({
        success: true,
        message: "Descripción del grupo actualizada correctamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
}
