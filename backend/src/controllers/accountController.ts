import { Request, Response } from "express";
import { pool } from "../database";
import bcrypt from "bcrypt";
import { QueryResult } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { safeDeleteFile, extractSafeRelativePath } from "../utils/pathHelpers";

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

      console.log("Información de la imagen:", {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      });

    const userId = req.user.id;
    const baseUrl = process.env.API_URL;
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    const fullImageUrl = `${baseUrl}${imageUrl}`;

      console.log("URL base:", baseUrl);
      console.log("URL relativa:", imageUrl);
      console.log("URL completa:", fullImageUrl);

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
          const success = safeDeleteFile(safePath, uploadsDir);

          if (success) {
            console.log("Imagen anterior eliminada con éxito");
          } else {
            console.log("No se pudo eliminar la imagen anterior");
          }
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

      console.log("Respuesta al cliente:", userResponse);

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
      console.log("1. Request user:", req.user);
      const userId = req.user.id;
      console.log("2. User ID extraído:", userId);
      console.log("3. Datos recibidos del cliente:", req.body);

      const { username, email, currentPassword, newPassword } = req.body;

      // Verificar si el usuario existe
      const userQuery = "SELECT * FROM users WHERE id = $1";
      console.log("4. Query a ejecutar:", userQuery);
      console.log("5. Params de la query:", [userId]);

      const userResult: QueryResult = await pool.query(userQuery, [userId]);
      console.log("6. Resultado de la búsqueda:", {
        encontrado: userResult.rows.length > 0,
        filas: userResult.rows.length,
      });

      if (userResult.rows.length === 0) {
        console.log("7. Usuario no encontrado en la base de datos");
        res.status(404).json({
          error: "Usuario no encontrado",
          debugInfo: {
            userId,
            requestUser: req.user,
          },
        });
        return;
      }

      const user = userResult.rows[0];
      console.log("8. Usuario encontrado:", {
        id: user.id,
        username: user.username,
        email: user.email,
      });

      // Verificar la contraseña actual
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      console.log("9. Contraseña válida:", isPasswordValid);

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

      console.log("10. Query de actualización:", {
        query,
        values: values.map((v, i) => `$${i + 1}: ${v}`),
      });

      const result: QueryResult = await pool.query(query, values);
      console.log("11. Resultado de la actualización:", result.rows[0]);

      // Construir respuesta con URL completa de la imagen si existe
      const baseUrl = (process.env.API_URL || "http://localhost:3001").replace(
        "/api",
        ""
      );
      const userResponse = {
        ...result.rows[0],
        profile_image: result.rows[0].profile_image
          ? `${baseUrl}${result.rows[0].profile_image}`
          : null,
      };

      res.json({
        message: "Usuario actualizado exitosamente",
        user: userResponse,
      });
    } catch (error) {
      console.error("ERROR COMPLETO:", error);
      res.status(500).json({
        error: "Error al actualizar el usuario",
        details: error instanceof Error ? error.message : "Error desconocido",
        debugInfo: {
          user: req.user,
          body: req.body,
        },
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
      const baseUrl = (process.env.API_URL || "http://localhost:3001").replace(
        "/api",
        ""
      );
      const userResponse = {
        ...result.rows[0],
        profile_image: result.rows[0].profile_image
          ? `${baseUrl}${result.rows[0].profile_image}`
          : null,
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

      // Eliminar la imagen de perfil si existe
      if (user.profile_image) {
        const fullImagePath = path.join(
          __dirname,
          "..",
          "..",
          user.profile_image.replace(/^\/uploads\//, "")
        );
        if (fs.existsSync(fullImagePath)) {
          fs.unlinkSync(fullImagePath);
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
      console.log("Obteniendo configuración para usuario:", userId);

      const result: QueryResult = await pool.query(
        "SELECT * FROM settings WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        console.log("No se encontró configuración, creando por defecto");
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
        console.log("Configuración encontrada:", result.rows[0]);
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
      console.log("Actualizando configuración para usuario:", userId);
      console.log("Nuevos valores:", {
        theme,
        notifications_enabled,
        language,
      });

      // Verificar si existe la configuración
      const checkResult: QueryResult = await pool.query(
        "SELECT * FROM settings WHERE user_id = $1",
        [userId]
      );

      let result: QueryResult;

      if (checkResult.rows.length === 0) {
        console.log("Creando nueva configuración");
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
        console.log("Actualizando configuración existente");
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

      console.log("Configuración actualizada:", result.rows[0]);
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
