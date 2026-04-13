import React from 'react';
import NoteActionsMenuBase from './NoteActionsMenuBase';
import '../../styles/notes.css';

interface NoteActionsMenuProps {
  noteId?: string;
  isNewNote?: boolean;
  onExport: (format: string, noteId?: string) => void;
  onInsertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  onImageUpload: () => void;
}

// Preserved for backward compatibility with consumers that import this variable
export let savedSelection: { start: number; end: number; textareaId: string } | null = null;

const NoteActionsMenu: React.FC<NoteActionsMenuProps> = (props) => {
  return <NoteActionsMenuBase {...props} closeAfterAction={false} />;
};

export default NoteActionsMenu;
