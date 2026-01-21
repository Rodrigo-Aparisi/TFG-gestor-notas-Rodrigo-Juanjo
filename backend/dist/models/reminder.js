"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reminder = void 0;
const database_1 = require("../../database");
class Reminder {
    static async find(conditions) {
        console.log('Condiciones de búsqueda:', conditions); // Debug
        const startDate = conditions.dateTime?.$gte ? new Date(conditions.dateTime.$gte) : new Date();
        const endDate = conditions.dateTime?.$lt ? new Date(conditions.dateTime.$lt) : new Date();
        const query = `
      SELECT 
        id,
        title,
        description,
        date_time as "dateTime",
        user_id as "userId",
        status_id as "statusId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM reminders 
      WHERE user_id = $1 
      AND date_time >= $2 
      AND date_time < $3 
      ORDER BY date_time ASC
    `;
        try {
            const result = await database_1.pool.query(query, [
                conditions.userId,
                startDate,
                endDate
            ]);
            // Transformar las fechas a formato ISO
            const formattedResults = result.rows.map(row => ({
                ...row,
                dateTime: new Date(row.dateTime).toISOString()
            }));
            return formattedResults;
        }
        catch (error) {
            console.error('Error in find:', error);
            throw error;
        }
    }
    static async create(data) {
        console.log('Datos para crear recordatorio:', data);
        const query = `
      INSERT INTO reminders (
        title, 
        description, 
        date_time, 
        user_id, 
        status_id,
        has_time,
        send_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING 
        id,
        title,
        description,
        date_time as "dateTime",
        user_id as "userId",
        status_id as "statusId",
        has_time as "hasTime",
        send_email as "sendEmail",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        try {
            const values = [
                data.title,
                data.description || '',
                new Date(data.dateTime),
                data.userId,
                data.statusId || 1,
                data.hasTime || false,
                data.sendEmail || false // Nuevo valor
            ];
            const result = await database_1.pool.query(query, values);
            const reminder = {
                ...result.rows[0],
                dateTime: new Date(result.rows[0].dateTime).toISOString()
            };
            return reminder;
        }
        catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }
    static async findOneAndUpdate(conditions, data) {
        console.log('Datos recibidos para actualización:', data);
        const query = `
      UPDATE reminders 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        date_time = COALESCE($3::timestamp, date_time),
        status_id = COALESCE($4, status_id),
        has_time = $5,
        send_email = COALESCE($6, send_email),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING 
        id,
        title,
        description,
        date_time as "dateTime",
        user_id as "userId",
        status_id as "statusId",
        has_time as "hasTime",
        send_email as "sendEmail",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        try {
            const dateTimeValue = data.dateTime ?
                (typeof data.dateTime === 'string' ?
                    new Date(data.dateTime) :
                    data.dateTime) :
                null;
            console.log('Valores a enviar en la consulta:', {
                title: data.title,
                description: data.description,
                dateTime: dateTimeValue,
                statusId: data.statusId,
                hasTime: data.hasTime,
                sendEmail: data.sendEmail,
                id: conditions.id,
                userId: conditions.userId
            });
            const result = await database_1.pool.query(query, [
                data.title,
                data.description,
                dateTimeValue,
                data.statusId,
                data.hasTime,
                data.sendEmail,
                conditions.id,
                conditions.userId
            ]);
            if (result.rows.length === 0) {
                console.log('No se encontró el recordatorio para actualizar');
                return null;
            }
            const updatedReminder = {
                ...result.rows[0],
                dateTime: new Date(result.rows[0].dateTime).toISOString(),
                hasTime: result.rows[0].hasTime
            };
            console.log('Recordatorio actualizado:', updatedReminder);
            return updatedReminder;
        }
        catch (error) {
            console.error('Error en findOneAndUpdate:', error);
            throw error;
        }
    }
    static async findOneAndDelete(conditions) {
        const query = `
      DELETE FROM reminders
      WHERE id = $1 AND user_id = $2
      RETURNING 
        id,
        title,
        description,
        date_time as "dateTime",
        user_id as "userId",
        status_id as "statusId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        try {
            const result = await database_1.pool.query(query, [
                conditions.id,
                conditions.userId
            ]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error in findOneAndDelete:', error);
            throw error;
        }
    }
    // Método adicional para obtener recordatorios con su estado
    static async findWithStatus(conditions) {
        try {
            if (!conditions.dateTime?.$gte || !conditions.dateTime?.$lt) {
                throw new Error('Se requieren fechas de inicio y fin');
            }
            // Asegurarse de que las fechas sean válidas
            const startDate = new Date(conditions.dateTime.$gte);
            const endDate = new Date(conditions.dateTime.$lt);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid time value');
            }
            console.log('Fechas de búsqueda:', { startDate, endDate }); // Debug
            const query = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.date_time as "dateTime",
          r.has_time as "hasTime",
          r.user_id as "userId",
          r.status_id as "statusId",
          r.send_email as "sendEmail",
          r.created_at as "createdAt",
          r.updated_at as "updatedAt",
          rs.name as "statusName"
        FROM reminders r
        LEFT JOIN reminder_status rs ON r.status_id = rs.id
        WHERE r.user_id = $1
        AND r.date_time >= $2
        AND r.date_time < $3
        ORDER BY r.date_time ASC
      `;
            const values = [
                conditions.userId,
                startDate.toISOString(),
                endDate.toISOString()
            ];
            console.log('Ejecutando query con valores:', values); // Debug
            const result = await database_1.pool.query(query, values);
            // Transformar los resultados
            const reminders = result.rows.map(row => ({
                ...row,
                dateTime: new Date(row.dateTime).toISOString(),
                hasTime: row.hasTime || false
            }));
            console.log('Recordatorios encontrados:', reminders); // Debug
            return reminders;
        }
        catch (error) {
            console.error('Error en findWithStatus:', error);
            if (error instanceof Error) {
                throw error;
            }
            else {
                throw new Error('Error desconocido en la base de datos');
            }
        }
    }
    static async findRemindersForEmailNotification() {
        try {
            const query = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.date_time as "dateTime",
          r.has_time as "hasTime",
          r.user_id as "userId",
          u.email as "userEmail",
          u.username
        FROM reminders r
        JOIN users u ON r.user_id = u.id
        WHERE r.send_email = true
          AND r.status_id = 1
          AND (
            -- Para recordatorios sin hora específica (enviar a las 00:00 del día anterior)
            (r.has_time = false AND 
            r.date_time::date - INTERVAL '1 day' = CURRENT_DATE AND 
            EXTRACT(HOUR FROM CURRENT_TIME) = 0 AND
            EXTRACT(MINUTE FROM CURRENT_TIME) BETWEEN 0 AND 59)
            OR
            -- Para recordatorios con hora específica (enviar una hora antes)
            (r.has_time = true AND 
            r.date_time BETWEEN NOW() + INTERVAL '1 hour' AND NOW() + INTERVAL '2 hours')
          )
      `;
            const result = await database_1.pool.query(query);
            return result.rows.map(row => ({
                ...row,
                dateTime: new Date(row.dateTime)
            }));
        }
        catch (error) {
            console.error('Error al buscar recordatorios para notificación por correo:', error);
            throw error;
        }
    }
}
exports.Reminder = Reminder;
