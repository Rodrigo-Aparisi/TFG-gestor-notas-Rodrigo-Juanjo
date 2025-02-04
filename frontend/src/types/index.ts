export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dateTime: Date;
  userId: string;
  statusId: number;
  statusName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderStatus {
  id: number;
  name: string;
}

export interface ReminderRecurrence {
  id: string;
  reminderId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalValue: number;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
