import React, { useState } from 'react';
import NoteImage from './NoteImage';
import { noteService } from '../../services/api';

interface SharedNoteCardProps {
  note: any;
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
}

const SharedNoteCard: React.FC<SharedNoteCardProps> = ({
  note,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea
}) => {
  const [editedTitle, setEditedTitle] = useState(note.title || '');
  const [editedContent, setEditedContent] = useState(note.content || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditable = note.can_edit === true;
  
  const handleUpdateNote = async () => {
    if (!isEditable) return;
    
    try {
      setIsSaving(true);
      await noteService.updateSharedNote(note.id, {
        title: editedTitle,
        content: editedContent
      });
    } catch (error) {
      console.error('Error al actualizar la nota compartida:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div 
      className={`note-card ${focusedNoteId === note.id ? 'focused' : ''} ${isEditable ? 'editable' : ''}`}
      onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
      style={{
        backgroundColor: note.color || undefined,
        borderColor: '#ccc',
        borderWidth: '1px'
      }}
    >
      <div 
        className="focus-indicator"
        onClick={(e) => handleFocusIndicatorClick(e, note.id)}
      />
      
      {isEditable && (
        <div className="edit-indicator">
          <i className="fas fa-edit"></i> Editable
        </div>
      )}
      
      <div className="note-content">
        <input
          type="text"
          value={isEditable ? editedTitle : note.title || ''}
          onChange={isEditable ? (e) => setEditedTitle(e.target.value) : undefined}
          readOnly={!isEditable}
          onBlur={isEditable ? handleUpdateNote : undefined}
          onClick={e => e.stopPropagation()}
        />
        
        <div className="shared-by">
          Compartida por: {note.shared_by || 'Desconocido'}
        </div>
        
        {/* Sección de imágenes */}
        {note.images && note.images.length > 0 && (
          <div className="note-images">
            {note.images.map((imageUrl, index) => (
              <NoteImage
                key={index}
                imageUrl={imageUrl}
                index={index}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
        
        <textarea
          value={isEditable ? editedContent : note.content || ''}
          onChange={isEditable ? (e) => {
            setEditedContent(e.target.value);
            autoResizeTextarea(e.target as HTMLTextAreaElement);
          } : undefined}
          readOnly={!isEditable}
          onBlur={isEditable ? handleUpdateNote : undefined}
          onClick={(e) => e.stopPropagation()}
          ref={(textarea) => {
            if (textarea) {
              autoResizeTextarea(textarea);
            }
          }}
        />
        
        {isEditable && isSaving && (
          <div className="saving-indicator">Guardando...</div>
        )}
      </div>
    </div>
  );
};

export default SharedNoteCard;
