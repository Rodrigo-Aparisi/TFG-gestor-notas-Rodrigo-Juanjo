import React, { useEffect, useRef, useState } from "react";
import { GroupNote } from "../../types";
import Masonry from "react-masonry-css";
import NoteImage from "../Notes/NoteImage";
import NoteActionsMenu from "../Notes/NoteActionsMenu";

interface NotesGroupsProps {
  notes: GroupNote[];
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  editingNote?: Record<string, GroupNote>;
  focusedNoteId?: string | null;
  sharingNoteId?: string | null;
  onEditNote: (note: GroupNote) => void;
  onDeleteNote: (noteId: string) => void;
  handleTogglePin?: (noteId: string, event?: React.MouseEvent) => void;
  handleToggleMark?: (noteId: string, event: React.MouseEvent) => Promise<void>;
  handleNoteChange?: (id: string, field: keyof GroupNote, value: any) => void;
  updateGroupNote?: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  handleFocus?: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick?: (event: React.MouseEvent, id: string) => void;
  setSharingNoteId?: React.Dispatch<React.SetStateAction<string | null>>;
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

// Interfaz para las props del componente individual de nota
interface GroupNoteItemProps {
  note: GroupNote;
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  editingNote: Record<string, GroupNote>;
  focusedNoteId: string | null;
  sharingNoteId: string | null;
  handleNoteChange: (id: string, field: keyof GroupNote, value: any) => void;
  updateGroupNote: (id: string, field?: keyof GroupNote) => Promise<boolean>;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  handleToggleMark: (id: string, event: React.MouseEvent) => Promise<void>;
  handleTogglePin: (noteId: string, event?: React.MouseEvent) => void;
  setSharingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    noteId: string
  ) => void;
  insertList: (noteId: string, type: "bullet" | "number") => void;
  onDeleteNote: (noteId: string) => void;
  autoResizeTextarea?: (element: HTMLTextAreaElement) => void;
  handleImageUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    noteId: string
  ) => Promise<void>;
  handleDeleteImage: (noteId: string, imageIndex: number) => Promise<void>;
  handleExportNote: (format: string, noteId?: string) => void;
  onEditNote: (note: GroupNote) => void;
}

// Función para formatear la fecha
const formatDate = (dateString: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  // Verificar si es una fecha válida
  if (isNaN(date.getTime())) return "";

  // Opciones de formato para español
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return date.toLocaleDateString("es-ES", options);
};

// Función para mostrar tiempo relativo (hace X tiempo)
const getTimeAgo = (dateString: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  // Verificar si es una fecha válida
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) {
    return "hace un momento";
  } else if (diffMin < 60) {
    return `hace ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;
  } else if (diffHour < 24) {
    return `hace ${diffHour} hora${diffHour === 1 ? "" : "s"}`;
  } else if (diffDay < 30) {
    return `hace ${diffDay} día${diffDay === 1 ? "" : "s"}`;
  } else {
    // Para fechas más antiguas, mostrar la fecha completa
    return formatDate(dateString);
  }
};

// Componente individual para cada nota de grupo
const GroupNoteItem: React.FC<GroupNoteItemProps> = ({
  note,
  currentUserId,
  isOwnerOrAdmin,
  editingNote,
  focusedNoteId,
  sharingNoteId,
  handleNoteChange,
  updateGroupNote,
  handleFocus,
  handleFocusIndicatorClick,
  handleToggleMark,
  handleTogglePin,
  setSharingNoteId,
  handleKeyDown,
  insertList,
  onDeleteNote,
  autoResizeTextarea,
  handleImageUpload,
  handleDeleteImage,
  handleExportNote,
  onEditNote,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [localTitle, setLocalTitle] = useState(note?.title || "");
  const [localContent, setLocalContent] = useState(note?.content || "");
  const [lastSavedAt, setLastSavedAt] = useState<number>(Date.now());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Actualizar los estados locales cuando cambia la nota
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title || "");
      setLocalContent(note.content || "");
    }
  }, [note]);

  // Implementación interna de autoResizeTextarea si no se proporciona como prop
  const resizeTextarea = (element: HTMLTextAreaElement) => {
    if (!element) return;

    // Guarda la posición actual del scroll
    const scrollPos = element.scrollTop;

    // Resetea la altura para obtener la altura real del contenido
    element.style.height = "auto";

    // Establece la nueva altura basada en el contenido
    const newHeight = element.scrollHeight;
    const maxHeight = 200; // Altura máxima para notas no enfocadas

    const isFocused = focusedNoteId === note?.id;

    if (isFocused) {
      // Para notas enfocadas - permitir más altura
      element.style.height = `${Math.min(element.scrollHeight, 500)}px`;
    } else {
      // Para notas normales - limitar altura
      element.style.height = `${Math.min(newHeight, maxHeight)}px`;
    }

    // Restaura la posición del scroll
    element.scrollTop = scrollPos;
  };

  // Usar la función proporcionada como prop o la implementación interna
  const resizeTextareaFn = autoResizeTextarea || resizeTextarea;

  // Aplicar resize cuando el componente se monta o cuando cambia el contenido o el estado de foco
  useEffect(() => {
    if (textareaRef.current && note) {
      resizeTextareaFn(textareaRef.current);
    }
  }, [localContent, focusedNoteId === note?.id, resizeTextareaFn, note]);

  // Añadir listener para el resize de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        resizeTextareaFn(textareaRef.current);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resizeTextareaFn]);

  // Función para guardar la nota automáticamente
  const saveNote = () => {
    if (!note) return;

    // Evitar guardar si no ha cambiado nada
    if (note.title === localTitle && note.content === localContent) {
      return;
    }

    // Actualizar la nota
    const updatedNote = {
      ...note,
      title: localTitle,
      content: localContent,
    };

    // Llamar a la función del padre para guardar la nota
    onEditNote(updatedNote);
    setLastSavedAt(Date.now());

    // También llamar a updateGroupNote para asegurar que se guarde en el backend
    if (updateGroupNote) {
      updateGroupNote(note.id).catch(console.error);
    }
  };

  // Configurar guardado automático con debounce
  const debouncedSave = (field: keyof GroupNote) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Guardar después de 1 segundo de inactividad
    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 1000);
  };

  // Limpiar el timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);

        // Guardar al desmontar si hay cambios pendientes
        if (
          note &&
          (note.title !== localTitle || note.content !== localContent)
        ) {
          saveNote();
        }
      }
    };
  }, [note, localTitle, localContent]);

  // Manejar cambio de título
  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    setIsEditing(true);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "title", newTitle);
    }

    debouncedSave("title");
  };

  // Manejar cambio de contenido
  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    setIsEditing(true);

    if (handleNoteChange && note) {
      handleNoteChange(note.id, "content", newContent);
    }

    resizeTextareaFn(e.target);
    debouncedSave("content");
  };

  // Manejar actualización al perder el foco
  const onTitleBlur = () => {
    if (!note) return;

    // Solo actualizar si hay cambios
    if (note.title !== localTitle) {
      // Actualizar el estado en el hook
      if (handleNoteChange) {
        handleNoteChange(note.id, "title", localTitle);
      }

      // Guardar los cambios en la base de datos
      if (updateGroupNote) {
        updateGroupNote(note.id, "title")
          .then((success) => {
            if (!success) {
              // Si falla la actualización, restaurar el título original
              setLocalTitle(note.title || "");
            }
          })
          .catch((error) => {
            console.error("Error al actualizar título:", error);
            // Restaurar el título original en caso de error
            setLocalTitle(note.title || "");
          });
      }
    }
  };

  const onContentBlur = () => {
    if (!note) return;

    // Solo actualizar si hay cambios
    if (note.content !== localContent) {
      // Actualizar el estado en el hook
      if (handleNoteChange) {
        handleNoteChange(note.id, "content", localContent);
      }

      // Guardar los cambios en la base de datos
      if (updateGroupNote) {
        updateGroupNote(note.id, "content")
          .then((success) => {
            if (!success) {
              // Si falla la actualización, restaurar el contenido original
              setLocalContent(note.content || "");
            }
          })
          .catch((error) => {
            console.error("Error al actualizar contenido:", error);
            // Restaurar el contenido original en caso de error
            setLocalContent(note.content || "");
          });
      }
    }
  };

  // Guardar la nota cuando se pierde el foco
  const handleNoteBlur = (e: React.FocusEvent) => {
    // Verificar si el foco se mantiene dentro de la misma nota
    if (noteRef.current && noteRef.current.contains(e.relatedTarget as Node)) {
      return; // El foco sigue dentro de la nota, no hacer nada
    }

    // Si estábamos editando, guardar los cambios
    if (isEditing && note) {
      saveNote();
      setIsEditing(false);
    }
  };

  // Si la nota no existe, no renderizar nada
  if (!note || !note.id) {
    return null;
  }

  // Determinar si esta nota está enfocada
  const isFocused = focusedNoteId === note.id;

  return (
    <div
      ref={noteRef}
      className={`note-card ${isFocused ? "focused" : ""} ${
        note.is_marked ? "marked" : ""
      }`}
      onClick={(e) => {
        if (!isFocused) {
          handleFocus(note.id, e);
        }
      }}
      style={{ backgroundColor: note.color || "#ffffff" }}
      data-note-id={note.id}
      tabIndex={0} // Hacer que el div pueda recibir foco
      onBlur={handleNoteBlur} // Manejar evento onBlur para guardar cambios
    >
      <div className="note-actions">
        {(note.user_id === currentUserId || isOwnerOrAdmin) && (
          <>
            <button
              className={`action-button ${note.is_marked ? "marked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMark(note.id, e);
              }}
              title={note.is_marked ? "Desmarcar nota" : "Marcar nota"}
            >
              <i className="fas fa-check-circle"></i>
            </button>

            <button
              className={`action-button ${note.is_pinned ? "pinned" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(note.id, e);
              }}
              title={note.is_pinned ? "Desfijar nota" : "Fijar nota"}
              style={
                note.is_pinned
                  ? {
                      color: "#2ecc71",
                      backgroundColor: "rgba(46, 204, 113, 0.1)",
                    }
                  : {}
              }
            >
              <i className="fas fa-thumbtack"></i>
            </button>
          </>
        )}
      </div>

      <div
        className="focus-indicator"
        onClick={(e) => {
          e.stopPropagation();
          handleFocusIndicatorClick(e, note.id);
        }}
      />

      <div className="note-content">
        <input
          ref={inputRef}
          type="text"
          value={localTitle}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Título"
          onFocus={() => setIsEditing(true)}
          data-note-id={note.id}
        />

        {/* Fecha de creación */}
        {note.created_at && (
          <div className="note-date">
            {getTimeAgo(note.updated_at || note.created_at)}
          </div>
        )}

        {/* Sección de imágenes */}
        {note.images && note.images.length > 0 && (
          <div className="note-images">
            {note.images.map((imageUrl, index) => (
              <div key={index} className="note-image-container">
                <img
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="note-image"
                />
                {(note.user_id === currentUserId || isOwnerOrAdmin) && (
                  <button
                    className="delete-image-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(note.id, index);
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={onContentChange}
          onKeyDown={(e) => handleKeyDown(e, note.id)}
          onBlur={onContentBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Escribe aquí tu nota..."
          onFocus={() => setIsEditing(true)}
          data-note-id={note.id}
        />
      </div>

      <div className="note-footer">
        <span>Por: {note.created_by_username}</span>
        <span>{getTimeAgo(note.updated_at || note.created_at)}</span>
      </div>

      <div className="note-actions-bottom">
        {/* Menú desplegable de acciones */}
        {(note.user_id === currentUserId || isOwnerOrAdmin) && (
          <NoteActionsMenu
            noteId={note.id}
            onExport={handleExportNote}
            onInsertList={insertList}
            onImageUpload={() =>
              document.getElementById(`image-input-${note.id}`)?.click()
            }
          />
        )}

        {/* Input oculto para subir imágenes */}
        <input
          id={`image-input-${note.id}`}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleImageUpload(e, note.id)}
        />

        {/* Botón de eliminar */}
        {(note.user_id === currentUserId || isOwnerOrAdmin) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            className="delete-button"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
};

// Componente principal que renderiza la lista de notas con Masonry
const GroupNotes: React.FC<NotesGroupsProps> = ({
  notes,
  currentUserId,
  isOwnerOrAdmin,
  editingNote = {},
  focusedNoteId: externalFocusedNoteId,
  sharingNoteId = null,
  onEditNote,
  onDeleteNote,
  handleTogglePin = () => {},
  handleToggleMark = async () => {},
  handleNoteChange = () => {},
  updateGroupNote = async () => false,
  handleFocus: externalHandleFocus,
  handleFocusIndicatorClick: externalHandleFocusIndicatorClick,
  setSharingNoteId = () => {},
  handleKeyDown = () => {},
  insertList = () => {},
  autoResizeTextarea,
  handleImageUpload = async () => {},
  handleDeleteImage = async () => {},
  handleExportNote = () => {},
}) => {
  // Estado local para manejar el ID de la nota enfocada si no se proporciona externamente
  const [internalFocusedNoteId, setInternalFocusedNoteId] = useState<
    string | null
  >(null);

  // Usar el focusedNoteId proporcionado o el interno
  const focusedNoteId =
    externalFocusedNoteId !== undefined
      ? externalFocusedNoteId
      : internalFocusedNoteId;

  // Manejar el enfoque de la nota internamente si no se proporciona una función externa
  const handleFocus = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (externalHandleFocus) {
      externalHandleFocus(id, event);
    } else {
      event.stopPropagation();
      setInternalFocusedNoteId(id);

      // Asegurar que el textarea se redimensione correctamente después de enfocar
      setTimeout(() => {
        const textarea = document.querySelector(
          `.note-card[data-note-id="${id}"] textarea`
        );
        if (textarea && autoResizeTextarea) {
          autoResizeTextarea(textarea as HTMLTextAreaElement);
        }
      }, 10);
    }
  };

  // Manejar el clic en el indicador de enfoque
  const handleFocusIndicatorClick = (event: React.MouseEvent, id: string) => {
    if (externalHandleFocusIndicatorClick) {
      externalHandleFocusIndicatorClick(event, id);
    } else {
      event.stopPropagation();

      // Guardar la nota antes de quitar el foco
      const note = notes.find((n) => n.id === id);
      if (note) {
        // Si hay cambios en la nota, guardarlos
        const editedNote = editingNote[id];
        if (editedNote) {
          onEditNote(editedNote);
          if (updateGroupNote) {
            updateGroupNote(id).catch(console.error);
          }
        }
      }

      setInternalFocusedNoteId(null);

      // Asegurar que todas las textareas se redimensionen correctamente después de quitar el enfoque
      setTimeout(() => {
        const textareas = document.querySelectorAll(".note-card textarea");
        textareas.forEach((textarea) => {
          if (autoResizeTextarea) {
            autoResizeTextarea(textarea as HTMLTextAreaElement);
          }
        });
      }, 10);
    }
  };

  // Añadir un listener para detectar clics fuera de las notas y quitar el enfoque
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".note-card") && internalFocusedNoteId !== null) {
        // Guardar cualquier nota que pudiera estar siendo editada
        const editedNoteId = internalFocusedNoteId;
        const note = notes.find((n) => n.id === editedNoteId);
        if (note) {
          // Si hay cambios en la nota, guardarlos
          const editedNote = editingNote[editedNoteId];
          if (editedNote) {
            onEditNote(editedNote);
            if (updateGroupNote) {
              updateGroupNote(editedNoteId).catch(console.error);
            }
          }
        }

        setInternalFocusedNoteId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [internalFocusedNoteId, notes, editingNote, onEditNote, updateGroupNote]);

  // Asegurar que notes es un array
  const safeNotes = Array.isArray(notes) ? notes : [];

  // Configuración de las columnas para Masonry
  const breakpointColumnsObj = {
    default: 4,
    1400: 3,
    1100: 2,
    700: 1,
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
          <GroupNoteItem
            key={note.id}
            note={note}
            currentUserId={currentUserId}
            isOwnerOrAdmin={isOwnerOrAdmin}
            editingNote={editingNote || {}}
            focusedNoteId={focusedNoteId}
            sharingNoteId={sharingNoteId}
            handleNoteChange={handleNoteChange}
            updateGroupNote={updateGroupNote}
            handleFocus={handleFocus}
            handleFocusIndicatorClick={handleFocusIndicatorClick}
            handleToggleMark={handleToggleMark}
            handleTogglePin={handleTogglePin}
            setSharingNoteId={setSharingNoteId}
            handleKeyDown={handleKeyDown}
            insertList={insertList}
            onDeleteNote={onDeleteNote}
            autoResizeTextarea={autoResizeTextarea}
            handleImageUpload={handleImageUpload}
            handleDeleteImage={handleDeleteImage}
            handleExportNote={handleExportNote}
            onEditNote={onEditNote}
          />
        );
      })}
    </Masonry>
  );
};

export default GroupNotes;
