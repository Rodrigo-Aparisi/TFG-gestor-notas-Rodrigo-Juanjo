import { pool } from '../config/database';

interface ReminderData {
  id?: string;
  title: string;
  description?: string;
  dateTime: Date | string;
  userId: string;
  statusId?: number;
  statusName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  focused?: boolean;
  hasTime: boolean;
  emailNotification?: boolean;
}

interface ReminderConditions {
  id?: string;
  userId?: string;
  dateTime?: {
      $gte?: Date;
      $lt?: Date;
  };
}

export class Reminder {
  static async find(conditions: ReminderConditions) {
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
      const result = await pool.query(query, [
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
    } catch (error) {
      console.error('Error in find:', error);
      throw error;
    }
  }

  static async create(data: ReminderData) {
    const query = `
      INSERT INTO reminders (
        title, 
        description, 
        date_time, 
        user_id, 
        status_id,
        has_time,
        email_notification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING 
        id,
        title,
        description,
        date_time as "dateTime",
        user_id as "userId",
        status_id as "statusId",
        has_time as "hasTime",
        email_notification as "emailNotification",
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
        data.emailNotification || false
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }
  

  static async findOneAndUpdate(conditions: ReminderConditions, data: Partial<ReminderData>) {
    console.log('Datos recibidos para actualización:', data); // Debug

    const query = `
      UPDATE reminders 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        date_time = COALESCE($3::timestamp, date_time),
        status_id = COALESCE($4, status_id),
        has_time = $5,
        email_notification = COALESCE($6, email_notification),
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
        email_notification as "emailNotification",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    try {
        const dateTimeValue = data.dateTime ? 
            (typeof data.dateTime === 'string' ? 
                new Date(data.dateTime) : 
                data.dateTime
            ) : 
            null;

        console.log('Valores a enviar en la consulta:', {
            title: data.title,
            description: data.description,
            dateTime: dateTimeValue,
            statusId: data.statusId,
            hasTime: data.hasTime,
            emailNotification: data.emailNotification,
            id: conditions.id,
            userId: conditions.userId
        });

        const result = await pool.query(query, [
            data.title,
            data.description,
            dateTimeValue,
            data.statusId,
            data.hasTime,
            data.emailNotification,
            conditions.id,
            conditions.userId
        ]);

        if (result.rows.length === 0) {
            console.log('No se encontró el recordatorio para actualizar');
            return null;
        }
        
        const updatedReminder = {
            ...result.rows[0],
            dateTime: new Date(result.rows[0].dateTime).toISOString()
        };

        console.log('Recordatorio actualizado:', updatedReminder);
        
        return updatedReminder;
    } catch (error) {
        console.error('Error en findOneAndUpdate:', error);
        throw error;
    }
  }


  static async findOneAndDelete(conditions: ReminderConditions) {
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
      const result = await pool.query(query, [
        conditions.id,
        conditions.userId
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in findOneAndDelete:', error);
      throw error;
    }
  }

  // Método adicional para obtener recordatorios con su estado
  static async findWithStatus(conditions: ReminderConditions) {
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

      // Modificar la consulta para asegurarse de que email_notification se incluye correctamente
      const query = `
        SELECT 
          r.id,
          r.title,
          r.description,
          r.date_time as "dateTime",
          r.has_time as "hasTime",
          r.user_id as "userId",
          r.status_id as "statusId",
          r.created_at as "createdAt",
          r.updated_at as "updatedAt",
          r.email_notification as "emailNotification",
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

      const result = await pool.query(query, values);

      // Transformar los resultados con cuidado
      const reminders = result.rows.map(row => {
        // Asegurarse de que todos los campos se mapean correctamente
        return {
          ...row,
          dateTime: new Date(row.dateTime).toISOString(),
          hasTime: row.hasTime || false,
          // Usar un valor por defecto para emailNotification si es null o undefined
          emailNotification: row.emailNotification !== null && row.emailNotification !== undefined 
            ? row.emailNotification 
            : false
        };
      });

      console.log('Recordatorios encontrados:', reminders.length); // Debug

      return reminders;
    } catch (error) {
      console.error('Error en findWithStatus:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Error desconocido en la base de datos');
      }
    }
  }
  
  
    
}
