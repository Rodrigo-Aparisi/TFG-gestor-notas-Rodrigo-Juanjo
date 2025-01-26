export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    created_at: Date;
  }
  
  export interface Note {
    id: string;
    title: string;
    content: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  }
  