import { pool } from '../config/database';

interface ReminderData {
  id?: string;
  title: string;
  description?: string;
  dateTime: Date;
  userId: string;
  statusId?: number;
}

interface ReminderConditions {
  _id?: string;
  userId?: string;
  dateTime?: {
    $gte?: Date;
    $lt?: Date;
  };
}

export class Reminder {
  static async find(conditions: ReminderConditions) {
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
        conditions.dateTime?.$gte,
        conditions.dateTime?.$lt
      ]);
      
      return result.rows;
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
        status_id
      )
      VALUES ($1, $2, $3, $4, $5)
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
        data.title,
        data.description || '',
        data.dateTime,
        data.userId,
        data.statusId || 1 // Por defecto, estado 'pendiente'
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  static async findOneAndUpdate(conditions: ReminderConditions, data: Partial<ReminderData>) {
    const query = `
      UPDATE reminders 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        date_time = COALESCE($3, date_time),
        status_id = COALESCE($4, status_id)
      WHERE id = $5 AND user_id = $6
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
        data.title,
        data.description,
        data.dateTime,
        data.statusId,
        conditions._id,
        conditions.userId
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in findOneAndUpdate:', error);
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
        conditions._id,
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
    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.date_time as "dateTime",
        r.user_id as "userId",
        r.status_id as "statusId",
        rs.name as "statusName",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt"
      FROM reminders r
      LEFT JOIN reminder_status rs ON r.status_id = rs.id
      WHERE r.user_id = $1 
      AND r.date_time >= $2 
      AND r.date_time < $3 
      ORDER BY r.date_time ASC
    `;
    
    try {
      const result = await pool.query(query, [
        conditions.userId,
        conditions.dateTime?.$gte,
        conditions.dateTime?.$lt
      ]);
      
      return result.rows;
    } catch (error) {
      console.error('Error in findWithStatus:', error);
      throw error;
    }
  }
}
