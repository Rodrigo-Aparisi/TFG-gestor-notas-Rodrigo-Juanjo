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
  id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  is_pinned: boolean;
  is_marked: boolean;
}

export interface Reminder {
  id: UUID;
  title: string;
  description?: string;
  dateTime: Date;
  userId: UUID; 
  statusId: number;
  statusName?: string;
  createdAt: Date;
  updatedAt: Date;
  focused?: boolean;
  hasTime: boolean;
}

export interface NewReminder {
  title: string;
  description: string;
  date: Date;
  time: string;
  statusId?: number;
  hasTime: boolean;
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
  hasTime: boolean;
}

// Interface para la actualización de recordatorios
export interface UpdateReminderData {
  title: string;
  description: string;
  date_time: string;
  status_id: number;
  has_time: boolean;
}

export interface EditingReminder {
  title: string;
  description: string;
  dateTime: Date;
  hasTime: boolean;
}
