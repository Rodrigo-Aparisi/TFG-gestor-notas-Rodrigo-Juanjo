import { Request, Response } from "express";
import { pool } from "../database";
import bcrypt from "bcrypt";
import { QueryResult } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { safeDeleteFile, extractSafeRelativePath } from "../utils/pathHelpers";
import { getBaseServerUrl, getProfileImageUrl } from "../utils/urlHelpers";

dotenv.config();

interface RequestWithFile extends Request {
  file: Express.Multer.File;
  user: {
    id: string;
    [key: string]: any;
  };
}

export const accountController = {
  uploadProfileImage: async (
    req: RequestWithFile,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.file) {
        res
          .status(400)
          .json({ error: "No se ha proporcionado ninguna imagen" });
        return;
      }

    const userId = req.user.id;
    const baseUrl = getBaseServerUrl();
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    const fullImageUrl = getProfileImageUrl(imageUrl) || `${baseUrl}${imageUrl}`;

      // Mover esta consulta aquí, antes de usarla
      const previousImageResult: QueryResult = await pool.query(
        "SELECT profile_image FROM users WHERE id = $1",
        [userId]
      );

      // Safely delete previous profile image if exists
      if (previousImageResult.rows[0]?.profile_image) {
        const previousImagePath = previousImageResult.rows[0].profile_image;

        // Extract safe relative path from DB
        const safePath = extractSafeRelativePath(previousImagePath, '/uploads/');

        if (safePath) {
          const uploadsDir = path.join(__dirname, "..", "..", "uploads");
          safeDeleteFile(safePath, uploadsDir);
        } else {
          console.warn(`Path inseguro detectado en DB: ${previousImagePath}`);
        }
      }

    // Actualizar la imagen de perfil en la base de datos
    // Guardar solo la ruta relativa en la base de datos
    // En accountController.ts
    const result: QueryResult = await pool.query(
        'UPDATE users SET profile_image = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, profile_image',
        [imageUrl, userId]
      );


      if (result.rows.length === 0) {
        // Corregir la ruta para eliminar la imagen en caso de error
        const uploadedImagePath = path.join(
          __dirname,
          "..",
          "config",
          "uploads",
          "profile-images",
          req.file.filename
        );
        if (fs.existsSync(uploadedImagePath)) {
          fs.unlinkSync(uploadedImagePath);
        }
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      // Construir el objeto de respuesta
      const userResponse = {
        ...result.rows[0],
        profile_image: fullImageUrl, // Usar la URL completa para la respuesta
      };

      res.json({
        message: "Imagen de perfil actualizada correctamente",
        profile_image: fullImageUrl,
        user: userResponse,
      });
    } catch (error) {
      // Corregir la ruta para eliminar la imagen en caso de error
      if (req.file) {
        const uploadedImagePath = path.join(
          __dirname,
          "..",
          "config",
          "uploads",
          "profile-images",
          req.file.filename
        );
        if (fs.existsSync(uploadedImagePath)) {
          fs.unlinkSync(uploadedImagePath);
        }
      }

      console.error("Error al subir la imagen de perfil:", error);
      res.status(500).json({
        error: "Error al procesar la imagen de perfil",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  },

  updateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { username, email, currentPassword, newPassword } = req.body;

      const userResult: QueryResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const user = userResult.rows[0];

      // Verificar la contraseña actual
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        res.status(401).json({ error: "Contraseña actual incorrecta" });
        return;
      }

      // Preparar la consulta de actualización
      let query = "UPDATE users SET username = $1, email = $2";
      let values = [username, email];

      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        query += ", password = $3";
        values.push(hashedPassword);
      }

      query +=
        ", updated_at = NOW() WHERE id = $" +
        (values.length + 1) +
        " RETURNING id, username, email, profile_image";
      values.push(userId);

      const result: QueryResult = await pool.query(query, values);

      // Construir respuesta con URL completa de la imagen si existe
      const userResponse = {
        ...result.rows[0],
        profile_image: getProfileImageUrl(result.rows[0].profile_image),
      };

      res.json({
        message: "Usuario actualizado exitosamente",
        user: userResponse,
      });
    } catch (error) {
      console.error("Error al actualizar el usuario:", error);
      res.status(500).json({
        error: "Error al actualizar el usuario",
      });
    }
  },

  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;

      const result: QueryResult = await pool.query(
        "SELECT id, username, email, profile_image, created_at FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      // Construir respuesta con URL completa de la imagen si existe
      const userResponse = {
        ...result.rows[0],
        profile_image: getProfileImageUrl(result.rows[0].profile_image),
      };

      res.json({ user: userResponse });
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      res.status(500).json({ error: "Error al obtener el perfil del usuario" });
    }
  },

  deleteAccount: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      const userResult: QueryResult = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({ error: "Contraseña incorrecta" });
        return;
      }

      // Eliminar la imagen de perfil si existe usando safeDeleteFile
      if (user.profile_image) {
        const safePath = extractSafeRelativePath(user.profile_image, '/uploads/');
        if (safePath) {
          const uploadsDir = path.join(__dirname, "..", "uploads");
          safeDeleteFile(safePath, uploadsDir);
        }
      }

      await pool.query("DELETE FROM users WHERE id = $1", [userId]);

      res.json({ message: "Cuenta eliminada exitosamente" });
    } catch (error) {
      console.error("Error al eliminar cuenta:", error);
      res.status(500).json({ error: "Error al eliminar la cuenta" });
    }
  },

  getUserSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;

      const result: QueryResult = await pool.query(
        "SELECT * FROM settings WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        const defaultSettings = {
          theme: "dark",
          notifications_enabled: true,
          language: "es",
        };

        const newSettingsResult: QueryResult = await pool.query(
          `INSERT INTO settings (user_id, theme, notifications_enabled, language)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *`,
          [
            userId,
            defaultSettings.theme,
            defaultSettings.notifications_enabled,
            defaultSettings.language,
          ]
        );

        res.json(newSettingsResult.rows[0]);
      } else {
        res.json(result.rows[0]);
      }
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      res.status(500).json({
        error: "Error al obtener la configuración del usuario",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  },

  updateUserSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const { theme, notifications_enabled, language } = req.body;

      // Verificar si existe la configuración
      const checkResult: QueryResult = await pool.query(
        "SELECT * FROM settings WHERE user_id = $1",
        [userId]
      );

      let result: QueryResult;

      if (checkResult.rows.length === 0) {
        result = await pool.query(
          `INSERT INTO settings (user_id, theme, notifications_enabled, language)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *`,
          [
            userId,
            theme || "dark",
            notifications_enabled || true,
            language || "es",
          ]
        );
      } else {
        result = await pool.query(
          `UPDATE settings
                     SET theme = COALESCE($2, theme),
                         notifications_enabled = COALESCE($3, notifications_enabled),
                         language = COALESCE($4, language),
                         updated_at = NOW()
                     WHERE user_id = $1
                     RETURNING *`,
          [userId, theme, notifications_enabled, language]
        );
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      res.status(500).json({
        error: "Error al actualizar la configuración del usuario",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  },
};
