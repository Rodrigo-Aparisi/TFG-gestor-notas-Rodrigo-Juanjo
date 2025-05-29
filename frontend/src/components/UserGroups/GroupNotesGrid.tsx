import React from "react";
import Masonry from "react-masonry-css";
import { GroupNote } from "../../types";
import GroupNotes from "./GroupNotes";

interface GroupNotesGridProps {
  notes: GroupNote[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  editingNote?: Record<string, GroupNote>;
  focusedNoteId?: string | null;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string, event?: React.MouseEvent) => void;
  handleToggleMark?: (noteId: string, event: React.MouseEvent) => Promise<void>;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: any) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  handleFocus?: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick?: (event: React.MouseEvent, id: string) => void;
  handleKeyDown?: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    noteId: string
  ) => void;
  insertList?: (noteId: string, type: "bullet" | "number") => void;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
  handleImageUpload?: (
    e: React.ChangeEvent<HTMLInputElement>,
    noteId: string
  ) => Promise<void>;
  handleDeleteImage?: (noteId: string, imageIndex: number) => Promise<void>;
  handleExportNote?: (format: string, noteId?: string) => void;
}

const GroupNotesGrid: React.FC<GroupNotesGridProps> = ({
  notes,
  currentUserId,
  isOwnerOrAdmin,
  editingNote = {},
  focusedNoteId,
  onEditNote,
  onDeleteNote,
  handleTogglePin = () => {},
  handleToggleMark = async () => {},
  handleNoteChange = () => {},
  updateGroupNote = async () => false,
  handleFocus,
  handleFocusIndicatorClick,
  handleKeyDown = () => {},
  insertList = () => {},
  autoResizeTextarea,
  handleImageUpload = async () => {},
  handleDeleteImage = async () => {},
  handleExportNote = () => {},
}) => {
  // Asegurar que notes es un array
  const safeNotes = Array.isArray(notes) ? notes : [];

  // Configuración de las columnas para Masonry
  const breakpointColumnsObj = {
    default: 5, // Número de columnas en pantallas grandes
    1100: 3,    // 3 columnas en pantallas medianas
    768: 2,     // 2 columnas en tablets
    480: 1      // 1 columna en móviles
  };

  if (safeNotes.length === 0) {
    return (
      <div className="empty-notes">
        <p>Este grupo no tiene notas</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {safeNotes.map((note) => {
        // Verificar que la nota es válida
        if (!note || !note.id) {
          return null;
        }

        return (
          <GroupNotes
            key={note.id}
            note={note}
            currentUserId={currentUserId}
            isOwnerOrAdmin={isOwnerOrAdmin}
            editingNote={editingNote}
            focusedNoteId={focusedNoteId}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
            handleTogglePin={handleTogglePin}
            handleToggleMark={handleToggleMark}
            handleNoteChange={handleNoteChange}
            updateGroupNote={updateGroupNote}
            handleFocus={handleFocus}
            handleFocusIndicatorClick={handleFocusIndicatorClick}
            handleKeyDown={handleKeyDown}
            insertList={insertList}
            autoResizeTextarea={autoResizeTextarea}
            handleImageUpload={handleImageUpload}
            handleDeleteImage={handleDeleteImage}
            handleExportNote={handleExportNote}
          />
        );
      })}
    </Masonry>
  );
};

export default GroupNotesGrid;