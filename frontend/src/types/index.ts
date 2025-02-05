// Definir un tipo para UUID para mejor claridad
type UUID = string;

export interface User {
  id: UUID;
  username: string;
  email: string;
  password?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Note {
  id: UUID;     
  title: string;
  content: string | null;
  user_id: UUID;
  created_at: Date;
  updated_at: Date;
}

export interface Reminder {
  id: UUID;
  title: string;
  description?: string;
  dateTime: Date; // Cambiado de date_time a dateTime
  userId: UUID; // Cambiado de user_id a userId
  statusId: number; // Cambiado de status_id a statusId
  statusName?: string;
  createdAt: Date; // Cambiado de created_at a createdAt
  updatedAt: Date; // Cambiado de updated_at a updatedAt
}

export interface ReminderStatus {
  id: number;
  name: string;
}

export interface ReminderRecurrence {
  id: UUID;     
  reminder_id: UUID;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_value: number; 
  end_date?: Date; 
  created_at: Date;
  updated_at: Date;
}

// Añadir interfaces para las consultas
export interface ReminderConditions {
  userId: string;
  dateTime: {
    $gte: Date;
    $lt: Date;
  };
}

// Interface para la creación de recordatorios
export interface CreateReminderData {
  title: string;
  description?: string;
  dateTime: Date;
  statusId?: number;
}

// Interface para la actualización de recordatorios
export interface UpdateReminderData {
  title?: string;
  description?: string;
  date_time?: Date;
  status_id?: number;
}
