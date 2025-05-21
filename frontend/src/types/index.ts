export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  profile_image?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  is_pinned: boolean;
  is_marked: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  images: string[];
  is_deleted?: boolean;
  deleted_at?: string | null; 
}

export interface SharedNote extends Note {
  shared_by: string;
  content: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  is_pinned: boolean;
  is_marked: boolean;
  images: string[];
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  user_id: string;
  username: string;
  profile_image?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}

export interface GroupNote {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_by_username: string;
  group_id: string;
  is_pinned: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  images: string[];
}

export interface CreateGroupData {
  name: string;
  description?: string;
}

export interface AddGroupMemberData {
  groupId: string;
  username: string;
  role?: 'admin' | 'member';
}

export interface CreateGroupNoteData {
  title: string;
  content: string;
  images?: string[];
}



export interface NotePosition {
  rect: DOMRect;
  columnPosition: 'left' | 'right';
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  images?: string[];
  [key: string]: any;
}

export type SortType = 'title' | 'date' | 'pinned';
export type SortDirection = 'asc' | 'desc';

export interface UserSortPreferences {
  sortType: SortType;
  sortDirection: SortDirection;
}

export interface SortPreferencesResponse {
  success: boolean;
  preferences?: UserSortPreferences;
  error?: string;
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
  focused?: boolean;
  hasTime: boolean;
  sendEmail?: boolean;
}

export interface NewReminder {
  title: string;
  description: string;
  date: Date;
  time: string;
  statusId?: number;
  hasTime: boolean;
  sendEmail?: boolean;
}

export interface ReminderStatus {
  id: number;
  name: string;
}

export interface ReminderRecurrence {
  id: string;     
  reminder_id: string;
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
  sendEmail?: boolean;
}

// Interface para la actualización de recordatorios
export interface UpdateReminderData {
  title: string;
  description: string;
  date_time: string;
  status_id: number;
  has_time: boolean;
  send_email?: boolean;
}

export interface EditingReminder {
  title: string;
  description: string;
  dateTime: Date;
  hasTime: boolean;
  sendEmail?: boolean;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  noteIds: string[];
}

export interface GroupResponse {
  id: string | number;
  name: string;
  color: string;
  note_ids: (string | null)[];
}