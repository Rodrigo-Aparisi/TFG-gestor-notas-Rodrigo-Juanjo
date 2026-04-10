import React, { useEffect, useState, useRef } from "react";
import { GroupNote } from "../../types";

interface GroupNoteProps {
  note: GroupNote;
  currentUserId: string;
  isOwnerOrAdmin?: boolean;
  editingNote?: Record<string, GroupNote>;
  focusedNoteId?: string | null;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string, event?: React.MouseEvent) => void;
  handleToggleMark?: (noteId: string, event: React.MouseEvent) => void;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: string | boolean | string[] | null) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  handleFocus?: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick?: (event: React.MouseEvent, id: string) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => void;
  insertList?: (noteId: string, type: 'bullet' | 'number') => void;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => void;
  handleDeleteImage?: (noteId: string, imageIndex: number) => void;
  handleExportNote?: (format: string, noteId?: string) => void;
}

const GroupNotes: React.FC<GroupNoteProps> = ({
  note,
  currentUserId,
  isOwnerOrAdmin,
  editingNote = {},
  focusedNoteId,
  onEditNote,
  onDeleteNote,
  handleTogglePin,
  handleToggleMark,
  handleNoteChange = () => {},
  updateGroupNote = async () => false,
  handleFocus,
  handleFocusIndicatorClick,
  handleKeyDown,
  insertList,
  autoResizeTextarea,
  handleImageUpload,
  handleDeleteImage,
  handleExportNote,
}) => {
  const [localTitle, setLocalTitle] = useState(note?.title || "");
  const [localContent, setLocalContent] = useState(note?.content || "");
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isFocused = focusedNoteId === note?.id;

  // Actualizar los estados locales cuando cambia la nota
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title || "");
      setLocalContent(note.content || "");
    }
  }, [note]);

  // Aplicar resize cuando el componente se monta o cuando cambia el contenido
  useEffect(() => {
    if (textareaRef.current && autoResizeTextarea) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [localContent, autoResizeTextarea]);

  // Manejar cambio de título
  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "title", newTitle);
    }
  };

  // Manejar cambio de contenido
  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "content", newContent);
    }

    // Ajustar la altura del textarea cuando cambia el contenido
    if (autoResizeTextarea) {
      autoResizeTextarea(e.target);
    }
  };

  // Manejar actualización al perder el foco
  const onTitleBlur = async () => {
    if (!note) return;

    // Solo actualizar si hay cambios
    if (note.title !== localTitle) {
      if (handleNoteChange) {
        handleNoteChange(note.id, "title", localTitle);
      }

      if (updateGroupNote) {
        try {
          const success = await updateGroupNote(note.id, "title");
          if (!success) {
            setError("No se pudo actualizar el título");
            setLocalTitle(note.title || "");
          } else {
            setError(null);
          }
        } catch (err) {
          console.error("Error al actualizar título:", err);
          setError("Error al actualizar el título");
          setLocalTitle(note.title || "");
        }
      }
    }
  };

  const onContentBlur = async () => {
    if (!note) return;

    if (note.content !== localContent) {
      if (handleNoteChange) {
        handleNoteChange(note.id, "content", localContent);
      }

      if (updateGroupNote) {
        try {
          const success = await updateGroupNote(note.id, "content");
          if (!success) {
            setError("No se pudo actualizar el contenido");
            setLocalContent(note.content || "");
          } else {
            setError(null);
          }
        } catch (err) {
          console.error("Error al actualizar contenido:", err);
          setError("Error al actualizar el contenido");
          setLocalContent(note.content || "");
        }
      }
    }
  };

  // Manejar eliminación de nota
  const handleDeleteNote = async () => {
    try {
      await onDeleteNote(note.id);
      setError(null);
    } catch (err) {
      console.error("Error al eliminar nota:", err);
      setError("Error al eliminar la nota");
    }
  };

  // Si la nota no existe, no renderizar nada
  if (!note || !note.id) {
    return null;
  }

  return (
    <div
      className={`note-card${isFocused ? ' focused' : ''}${note.is_marked ? ' marked' : ''}`}
      onClick={(e) => !isFocused && handleFocus && handleFocus(note.id, e)}
      data-note-id={note.id}
    >
      {error && <div className="error-message">{error}</div>}

      {/* Barra de acciones (pin, mark, exportar) — mismo patrón que NoteCard */}
      <div className="note-actions">
        {handleToggleMark && (
          <button
            className={`action-button${note.is_marked ? ' marked' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleToggleMark(note.id, e); }}
            title={note.is_marked ? 'Desmarcar nota' : 'Marcar nota'}
          >
            <i className="fas fa-check-circle"></i>
          </button>
        )}

        {handleTogglePin && (
          <button
            className={`action-button${note.is_pinned ? ' pinned' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id, e); }}
            title={note.is_pinned ? 'Desfijar nota' : 'Fijar nota'}
            style={note.is_pinned ? { color: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)' } : {}}
          >
            <i className="fas fa-thumbtack"></i>
          </button>
        )}

        {handleExportNote && (
          <div style={{ position: 'relative' }}>
            <button
              className="action-button"
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(prev => !prev); }}
              title="Exportar nota"
            >
              <i className="fas fa-download"></i>
            </button>
            {showExportMenu && (
              <div
                className="export-menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  zIndex: 10,
                  minWidth: '100px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <button
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleExportNote('pdf', note.id); setShowExportMenu(false); }}
                >
                  PDF
                </button>
                <button
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleExportNote('txt', note.id); setShowExportMenu(false); }}
                >
                  TXT
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicador de foco */}
      {handleFocusIndicatorClick && (
        <div
          className="focus-indicator"
          onClick={(e) => handleFocusIndicatorClick(e, note.id)}
        />
      )}

      <div className="note-content">
        <input
          type="text"
          value={localTitle}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Título"
          data-note-id={note.id}
          className="note-title-input"
        />

        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={onContentChange}
          onBlur={onContentBlur}
          onKeyDown={handleKeyDown ? (e) => handleKeyDown(e, note.id) : undefined}
          placeholder="Escribe aquí tu nota..."
          onInput={(e) => autoResizeTextarea && autoResizeTextarea(e.target as HTMLTextAreaElement)}
          data-note-id={note.id}
          className="note-content-textarea"
        />
      </div>

      {/* Información del creador (opcional) */}
      {note.created_by_username && (
        <div className="note-creator">
          Creado por: {note.created_by_username}
        </div>
      )}

      {/* Acciones de lista (solo cuando la nota está enfocada) */}
      {isFocused && insertList && (
        <div className="list-actions" style={{ display: 'flex', gap: '6px', padding: '4px 8px' }}>
          <button
            className="action-button"
            onClick={(e) => { e.stopPropagation(); insertList(note.id, 'bullet'); }}
            title="Insertar lista de viñetas"
          >
            <i className="fas fa-list-ul"></i>
          </button>
          <button
            className="action-button"
            onClick={(e) => { e.stopPropagation(); insertList(note.id, 'number'); }}
            title="Insertar lista numerada"
          >
            <i className="fas fa-list-ol"></i>
          </button>
        </div>
      )}

      {/* Imágenes adjuntas */}
      {note.images && note.images.length > 0 && (
        <div className="note-images">
          {note.images.map((imageUrl, index) => (
            <div key={index} className="note-image-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imageUrl} alt={`Imagen ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '120px' }} />
              {handleDeleteImage && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(note.id, index); }}
                  title="Eliminar imagen"
                  style={{ position: 'absolute', top: 0, right: 0, background: '#f44336', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '20px', padding: 0 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subir imagen */}
      {handleImageUpload && (
        <label style={{ cursor: 'pointer', fontSize: '12px', color: '#888', padding: '4px 8px', display: 'block' }}>
          <i className="fas fa-image"></i> Añadir imagen
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, note.id)}
          />
        </label>
      )}

      <div className="note-actions-bottom">
        <button
          onClick={handleDeleteNote}
          className="delete-button"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default GroupNotes;
