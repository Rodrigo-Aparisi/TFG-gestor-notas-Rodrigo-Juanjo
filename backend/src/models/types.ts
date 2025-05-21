export interface User {
  id: string;
  username: string;
  email: string;
  created_at: Date;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface EditingReminder {
  title: string;
  description: string;
  dateTime: Date;
  hasTime: boolean;
  sendEmail?: boolean;
}
