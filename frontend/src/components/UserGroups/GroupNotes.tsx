import React, { useEffect, useState, useRef } from "react";
import { GroupNote } from "../../types";

interface GroupNoteProps {
  note: GroupNote;
  currentUserId: string;
  editingNote?: Record<string, GroupNote>;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: any) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
}

const GroupNotes: React.FC<GroupNoteProps> = ({
  note,
  currentUserId,
  editingNote = {},
  onEditNote,
  onDeleteNote,
  handleNoteChange = () => {},
  updateGroupNote = async () => false,
  autoResizeTextarea,
}) => {
  const [localTitle, setLocalTitle] = useState(note?.title || "");
  const [localContent, setLocalContent] = useState(note?.content || "");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Implementación interna de autoResizeTextarea si no se proporciona como prop
  const resizeTextarea = (element: HTMLTextAreaElement) => {
    if (!element) return;
    
    // Guarda la posición actual del scroll
    const scrollPos = element.scrollTop;
    
    // Resetea la altura para obtener la altura real del contenido
    element.style.height = 'auto';
    
    // Establece la nueva altura basada en el contenido
    const newHeight = element.scrollHeight;
    element.style.height = `${newHeight}px`;
    
    // Restaura la posición del scroll
    element.scrollTop = scrollPos;
  };

  // Usar la función proporcionada como prop o la implementación interna
  const resizeTextareaFn = autoResizeTextarea || resizeTextarea;

  // Actualizar los estados locales cuando cambia la nota
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title || "");
      setLocalContent(note.content || "");
    }
  }, [note]);

  // Aplicar resize cuando el componente se monta o cuando cambia el contenido
  useEffect(() => {
    if (textareaRef.current) {
      resizeTextareaFn(textareaRef.current);
    }
  }, [localContent]);

  // Añadir listener para el resize de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        resizeTextareaFn(textareaRef.current);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Manejar cambio de título
  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    setIsEditing(true);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "title", newTitle);
    }
  };

  // Manejar cambio de contenido
  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    setIsEditing(true);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "content", newContent);
    }
    
    // Ajustar la altura del textarea cuando cambia el contenido
    resizeTextareaFn(e.target);
  };

  // Manejar actualización al perder el foco
  const onTitleBlur = async () => {
    if (!note) return;

    // Solo actualizar si hay cambios
    if (note.title !== localTitle) {
      // Actualizar el estado en el hook
      if (handleNoteChange) {
        handleNoteChange(note.id, "title", localTitle);
      }

      // Guardar los cambios en la base de datos
      if (updateGroupNote) {
        try {
          const success = await updateGroupNote(note.id, "title");
          if (!success) {
            setError("No se pudo actualizar el título");
            // Restaurar el título original si falla
            setLocalTitle(note.title || "");
          } else {
            setError(null);
          }
        } catch (err) {
          console.error("Error al actualizar título:", err);
          setError("Error al actualizar el título");
          // Restaurar el título original si falla
          setLocalTitle(note.title || "");
        }
      }
    }
  };

  const onContentBlur = async () => {
    if (!note) return;

    // Solo actualizar si hay cambios
    if (note.content !== localContent) {
      // Actualizar el estado en el hook
      if (handleNoteChange) {
        handleNoteChange(note.id, "content", localContent);
      }

      // Guardar los cambios en la base de datos
      if (updateGroupNote) {
        try {
          const success = await updateGroupNote(note.id, "content");
          if (!success) {
            setError("No se pudo actualizar el contenido");
            // Restaurar el contenido original si falla
            setLocalContent(note.content || "");
          } else {
            setError(null);
          }
        } catch (err) {
          console.error("Error al actualizar contenido:", err);
          setError("Error al actualizar el contenido");
          // Restaurar el contenido original si falla
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
    <div className="note-card">
      {error && <div className="error-message">{error}</div>}
      <div className="note-content">
        <input
          type="text"
          value={localTitle}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
          placeholder="Título"
          onFocus={() => setIsEditing(true)}
          data-note-id={note.id}
          className="note-title-input"
        />

        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={onContentChange}
          onBlur={onContentBlur}
          placeholder="Escribe aquí tu nota..."
          onFocus={() => setIsEditing(true)}
          onInput={(e) => resizeTextareaFn(e.target as HTMLTextAreaElement)}
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
