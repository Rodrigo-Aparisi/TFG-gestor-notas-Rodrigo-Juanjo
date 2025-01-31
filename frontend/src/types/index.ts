export interface User {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
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
  description: string;
  dateTime: Date;
}
