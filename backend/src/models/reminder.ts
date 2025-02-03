import { pool } from '../config/database';

export class Reminder {
  static async find(conditions: any) {
    const { userId, dateTime } = conditions;
    const query = `
      SELECT * FROM reminders 
      WHERE user_id = $1 
      AND date_time >= $2 
      AND date_time < $3 
      ORDER BY date_time ASC
    `;
    
    const result = await pool.query(query, [
      userId,
      dateTime.$gte,
      dateTime.$lt
    ]);
    
    return result.rows;
  }

  static async create(data: any) {
    const query = `
      INSERT INTO reminders (title, description, date_time, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      data.title,
      data.description,
      data.dateTime,
      data.userId
    ]);
    
    return result.rows[0];
  }

  static async findOneAndUpdate(conditions: any, data: any) {
    const query = `
      UPDATE reminders 
      SET title = $1, description = $2, date_time = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      data.title,
      data.description,
      data.dateTime,
      conditions._id,
      conditions.userId
    ]);
    
    return result.rows[0];
  }

  static async findOneAndDelete(conditions: any) {
    const query = `
      DELETE FROM reminders
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      conditions._id,
      conditions.userId
    ]);
    
    return result.rows[0];
  }
}
