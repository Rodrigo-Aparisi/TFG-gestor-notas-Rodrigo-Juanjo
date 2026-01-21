import React, { createContext, useContext, ReactNode } from 'react';
import { Note } from '../types';

interface NotesContextType {
  // Note manipulation functions
  handleNoteChange: (id: string, field: 'title' | 'content', value: string) => void;
  handleUpdateNote: (id: string, field: 'title' | 'content') => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
  handleToggleMark: (id: string, event: React.MouseEvent) => Promise<void>;
  handleTogglePin: (id: string, event: React.MouseEvent) => Promise<void>;

  // Image functions
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  handleDeleteImage: (noteId: string, imageIndex: number) => Promise<void>;

  // Export functions
  handleExportNote: (format: string, noteId?: string) => void;

  // Text editing functions
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote?: boolean) => void;
  insertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;

  // UI state
  focusedNoteId: string | null;
  sharingNoteId: string | null;
  setSharingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  handleBlur: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

interface NotesProviderProps {
  children: ReactNode;
  value: NotesContextType;
}

export const NotesProvider: React.FC<NotesProviderProps> = ({ children, value }) => {
  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

// Custom hook to use the NotesContext
export const useNotesContext = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotesContext must be used within a NotesProvider');
  }
  return context;
};

export default NotesContext;
