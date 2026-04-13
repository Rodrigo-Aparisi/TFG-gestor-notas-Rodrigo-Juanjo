import React from 'react';
import NoteActionsMenuBase from '../Notes/NoteActionsMenuBase';
import '../../styles/groups.css';

interface GroupNoteActionsMenuProps {
  noteId?: string;
  isNewNote?: boolean;
  onExport: (format: string, noteId?: string) => void;
  onInsertList: (noteId: string, type: 'bullet' | 'number') => void;
  onImageUpload: () => void;
}

// Preserved for backward compatibility with consumers that import this variable
export let savedGroupSelection: { start: number; end: number; textareaId: string } | null = null;

const GroupNoteActionsMenu: React.FC<GroupNoteActionsMenuProps> = (props) => {
  return (
    <NoteActionsMenuBase
      {...props}
      closeAfterAction={true}
    />
  );
};

export default GroupNoteActionsMenu;
