import React, { useState, useEffect } from "react";
import { noteService } from "../../services/api";
import NoteImage from "./NoteImage";
import NoteActionsMenu from "./NoteActionsMenu";
import { SharedNote } from "../../types";

interface SharedNoteCardProps {
  note: SharedNote;
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  showFeedback?: (message: string) => void;
  insertList?: (noteId: string, type: "bullet" | "number") => void;
  handleDeleteSharedImage?: (noteId: string, imageIndex: number) => Promise<boolean>;
  handleAddSharedImage?: (noteId: string, file: File) => Promise<string>;
  handleExportSharedNote?: (format: string, noteData: string | SharedNote) => void;
}

const SharedNoteCard: React.FC<SharedNoteCardProps> = ({
  note,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea,
  showFeedback,
  insertList,
  handleDeleteSharedImage,
  handleAddSharedImage,
  handleExportSharedNote,
}) => {
  const [editedTitle, setEditedTitle] = useState(note.title || "");
  const [editedContent, setEditedContent] = useState(note.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", type: "" });

  // Determinar si la nota es editable
  const isEditable = note.can_edit === true;

  // Efecto para actualizar los estados cuando cambia la nota
  useEffect(() => {
    setEditedTitle(note.title || "");
    setEditedContent(note.content || "");
  }, [note]);

  // Función para guardar cambios en la nota compartida
  const handleUpdateNote = async () => {
    if (!isEditable) return;

    try {
      setIsSaving(true);
      console.log("Actualizando nota:", {
        noteId: note.id,
        title: editedTitle,
        content: editedContent,
      });

      await noteService.updateSharedNote(note.id, {
        title: editedTitle,
        content: editedContent,
      });

      console.log("Nota actualizada exitosamente");
      if (showFeedback) {
        showFeedback("Cambios guardados correctamente");
      } else {
        setFeedback({ message: "Cambios guardados", type: "success" });
        setTimeout(() => setFeedback({ message: "", type: "" }), 3000);
      }
    } catch (error: unknown) {
      console.error("Error al actualizar la nota compartida:", error);
      const apiError = error as { response?: { data?: unknown; status?: number } };

      if (error && typeof error === "object" && "response" in error) {
        console.error("Error response:", apiError.response?.data);
        console.error("Error status:", apiError.response?.status);
      }

      if (showFeedback) {
        showFeedback("Error al guardar los cambios");
      } else {
        setFeedback({ message: "Error al guardar los cambios", type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Función para manejar teclas en el textarea
  const handleSharedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isEditable) return;

    if (e.key === "Enter") {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;

      // Verificar si estamos en una línea de lista
      const textBeforeCursor = content.substring(0, selectionStart);
      const lines = textBeforeCursor.split("\n");
      const currentLineIndex = lines.length - 1;
      const currentLine = lines[currentLineIndex] || "";

      // Detectar si la línea actual es una lista
      const bulletMatch = currentLine.match(/^(\s*)([•\-*]|\d+\.)\s*/);
      if (bulletMatch) {
        e.preventDefault(); // Prevenir el comportamiento predeterminado

        const [, indent, bullet] = bulletMatch;

        // Si la línea está vacía excepto por el marcador, terminar la lista
        if (currentLine.trim() === bullet.trim()) {
          const newContent =
            content.slice(0, selectionStart - bulletMatch[0].length) +
            "\n" +
            content.slice(selectionStart);

          setEditedContent(newContent);

          // Posicionar el cursor después del salto de línea
          setTimeout(() => {
            textarea.selectionStart =
              selectionStart - bulletMatch[0].length + 1;
            textarea.selectionEnd = textarea.selectionStart;
          }, 0);

          return;
        }

        // Continuar la lista con el siguiente elemento
        const newBullet = bullet.match(/\d+\./)
          ? `${parseInt(bullet) + 1}.`
          : "•";

        const newContent =
          content.slice(0, selectionStart) +
          "\n" +
          indent +
          newBullet +
          " " +
          content.slice(selectionStart);

        setEditedContent(newContent);

        // Posicionar el cursor después del nuevo marcador
        const newPosition =
          selectionStart + 1 + indent.length + newBullet.length + 1;
        setTimeout(() => {
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
        }, 0);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;

      // Insertar tabulación (4 espacios)
      const newContent =
        content.slice(0, selectionStart) +
        "    " +
        content.slice(selectionStart);

      setEditedContent(newContent);

      // Posicionar el cursor después de la tabulación
      setTimeout(() => {
        textarea.selectionStart = selectionStart + 4;
        textarea.selectionEnd = textarea.selectionStart;
      }, 0);
    }
  };

  // Función para subir imágenes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      !isEditable ||
      !e.target.files ||
      e.target.files.length === 0 ||
      !handleAddSharedImage
    )
      return;

    try {
      setIsSaving(true);
      const file = e.target.files[0];

      // Usar la función del hook para subir la imagen
      await handleAddSharedImage(note.id, file);

      if (showFeedback) {
        showFeedback("Imagen subida correctamente");
      } else {
        setFeedback({
          message: "Imagen subida correctamente",
          type: "success",
        });
        setTimeout(() => setFeedback({ message: "", type: "" }), 3000);
      }
    } catch (error: unknown) {
      console.error("Error al subir imagen:", error);
      if (showFeedback) {
        showFeedback("Error al subir imagen");
      } else {
        setFeedback({ message: "Error al subir imagen", type: "error" });
      }
    } finally {
      setIsSaving(false);
      e.target.value = ""; // Resetear input
    }
  };

  // Función para eliminar imágenes
  const handleDeleteImage = async (imageIndex: number) => {
    if (!isEditable || !handleDeleteSharedImage) return;

    try {
      setIsSaving(true);
      await handleDeleteSharedImage(note.id, imageIndex);

      if (showFeedback) {
        showFeedback("Imagen eliminada");
      } else {
        setFeedback({ message: "Imagen eliminada", type: "success" });
        setTimeout(() => setFeedback({ message: "", type: "" }), 3000);
      }
    } catch (error: unknown) {
      console.error("Error al eliminar imagen:", error);
      if (showFeedback) {
        showFeedback("Error al eliminar imagen");
      } else {
        setFeedback({ message: "Error al eliminar imagen", type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Función para exportar la nota
  const handleExport = (format: string) => {
    if (handleExportSharedNote) {
      // Crear una copia de la nota con los valores editados actuales
      const currentNoteState = {
        ...note,
        title: isEditable ? editedTitle : note.title,
        content: isEditable ? editedContent : note.content,
      };

      // Pasar esta versión actualizada de la nota
      handleExportSharedNote(format, currentNoteState);
    }
  };

  return (
    <div
      className={`note-card ${focusedNoteId === note.id ? "focused" : ""} ${
        isEditable ? "editable-note" : ""
      }`}
      onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
      style={{
        backgroundColor: note.color || undefined,
        borderColor: isEditable ? "#2ecc71" : "#ccc",
        borderWidth: isEditable ? "2px" : "1px",
      }}
      data-note-id={note.id}
    >
      {/* Indicador de edición */}
      {isEditable && (
        <div className="edit-indicator">
          <i className="fas fa-edit"></i> Editable
        </div>
      )}

      <div
        className="focus-indicator"
        onClick={(e) => handleFocusIndicatorClick(e, note.id)}
      />

      <div className="note-content">
        <input
          type="text"
          value={isEditable ? editedTitle : note.title || ""}
          onChange={
            isEditable ? (e) => setEditedTitle(e.target.value) : undefined
          }
          readOnly={!isEditable}
          onBlur={isEditable ? handleUpdateNote : undefined}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="shared-by">
          Compartida por: {note.shared_by || "Desconocido"}
        </div>

        {/* Sección de imágenes */}
        {note.images && note.images.length > 0 && (
          <div className="note-images">
            {note.images.map((imageUrl: string, index: number) => (
              <NoteImage
                key={index}
                imageUrl={imageUrl}
                index={index}
                onDelete={
                  isEditable ? () => handleDeleteImage(index) : () => {}
                }
              />
            ))}
          </div>
        )}

        <textarea
          data-note-id={note.id}
          value={isEditable ? editedContent : note.content || ""}
          onChange={
            isEditable
              ? (e) => {
                  setEditedContent(e.target.value);
                  autoResizeTextarea(e.target as HTMLTextAreaElement);
                }
              : undefined
          }
          onKeyDown={isEditable ? handleSharedKeyDown : undefined}
          readOnly={!isEditable}
          onBlur={isEditable ? handleUpdateNote : undefined}
          onClick={(e) => e.stopPropagation()}
          ref={(textarea) => {
            if (textarea) {
              autoResizeTextarea(textarea);
            }
          }}
        />

        {/* Opciones de edición solo para notas editables */}
        {isEditable && (
          <div className="note-actions-bottom">
            {/* Usar el menú de acciones para notas */}
            <NoteActionsMenu
              noteId={String(note.id)}
              onExport={handleExport}
              onInsertList={(noteId, type) => {
                if (insertList) {
                  insertList(String(noteId), type);
                }
              }}
              onImageUpload={() => {
                document
                  .getElementById(`shared-image-input-${note.id}`)
                  ?.click();
              }}
            />

            <input
              id={`shared-image-input-${note.id}`}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
        )}

        {/* Indicador de guardado */}
        {isSaving && <div className="saving-indicator">Guardando...</div>}

        {/* Feedback local (si no se usa el global) */}
        {!showFeedback && feedback.message && (
          <div className={`note-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedNoteCard;
