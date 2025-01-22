export interface User {
    id: string;
    username: string;
    email: string;
  }
  
  export interface Note {
    id: string;
    title: string;
    content: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }
  