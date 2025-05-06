import React, { useState, useEffect } from 'react';
import { noteService } from '../../services/api';
import NoteImage from './NoteImage';

interface SharedNoteCardProps {
  note: any;
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  showFeedback?: (message: string) => void; // Opcional para mantener compatibilidad
}

const SharedNoteCard: React.FC<SharedNoteCardProps> = ({
  note,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  autoResizeTextarea,
  showFeedback
}) => {
  const [editedTitle, setEditedTitle] = useState(note.title || '');
  const [editedContent, setEditedContent] = useState(note.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  
  // Determinar si la nota es editable
  const isEditable = note.can_edit === true;
  
  // Efecto para actualizar los estados cuando cambia la nota
  useEffect(() => {
    setEditedTitle(note.title || '');
    setEditedContent(note.content || '');
  }, [note]);

  // Función para guardar cambios en la nota compartida
  const handleUpdateNote = async () => {
    if (!isEditable) return;
    
    try {
      setIsSaving(true);
      console.log('Actualizando nota:', { 
        noteId: note.id, 
        title: editedTitle, 
        content: editedContent 
      });
      
      await noteService.updateSharedNote(note.id, {
        title: editedTitle,
        content: editedContent
      });
      
      console.log('Nota actualizada exitosamente');
      if (showFeedback) {
        showFeedback('Cambios guardados correctamente');
      } else {
        setFeedback({ message: 'Cambios guardados', type: 'success' });
        // Ocultar después de 3 segundos
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      }
    } catch (error: any) { // Usar any para poder acceder a error.response
      console.error('Error al actualizar la nota compartida:', error);
      
      // Mostrar más detalles del error si están disponibles
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
      }
      
      if (showFeedback) {
        showFeedback('Error al guardar los cambios');
      } else {
        setFeedback({ message: 'Error al guardar los cambios', type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Función para insertar listas en el contenido
  const insertList = (type: 'bullet' | 'number') => {
    if (!isEditable) return;
    
    const textarea = document.querySelector(`textarea[data-note-id="\${note.id}"]`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = editedContent;
    
    let prefix = '';
    if (type === 'bullet') {
      prefix = '• ';
    } else if (type === 'number') {
      prefix = '1. ';
    }
    
    const newContent = content.substring(0, start) + prefix + content.substring(end);
    setEditedContent(newContent);
    
    // Focus y posicionar cursor después del prefijo
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + prefix.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Función para subir imágenes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditable || !e.target.files || e.target.files.length === 0) return;
    
    try {
      setIsSaving(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await noteService.uploadNoteImage(formData);
      if (response.data && response.data.data && response.data.data.imageUrl) {
        // Actualizar la nota con la nueva imagen
        await noteService.updateSharedNote(note.id, {
          images: [...(note.images || []), response.data.data.imageUrl]
        });
        
        // Actualizar la UI
        if (showFeedback) {
          showFeedback('Imagen subida correctamente');
        } else {
          setFeedback({ message: 'Imagen subida correctamente', type: 'success' });
          setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
        }
      }
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      if (showFeedback) {
        showFeedback('Error al subir imagen');
      } else {
        setFeedback({ message: 'Error al subir imagen', type: 'error' });
      }
    } finally {
      setIsSaving(false);
      e.target.value = ''; // Resetear input
    }
  };

  // Función para eliminar imágenes
  const handleDeleteImage = async (imageIndex: number) => {
    if (!isEditable) return;
    
    try {
      setIsSaving(true);
      const updatedImages = [...(note.images || [])];
      updatedImages.splice(imageIndex, 1);
      
      await noteService.updateSharedNote(note.id, {
        images: updatedImages
      });
      
      if (showFeedback) {
        showFeedback('Imagen eliminada');
      } else {
        setFeedback({ message: 'Imagen eliminada', type: 'success' });
        setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      }
    } catch (error: any) {
      console.error('Error al eliminar imagen:', error);
      if (showFeedback) {
        showFeedback('Error al eliminar imagen');
      } else {
        setFeedback({ message: 'Error al eliminar imagen', type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className={`note-card ${focusedNoteId === note.id ? 'focused' : ''} ${isEditable ? 'editable-note' : ''}`}
      onClick={(e) => !focusedNoteId && handleFocus(note.id, e)}
      style={{
        backgroundColor: note.color || undefined,
        borderColor: isEditable ? '#2ecc71' : '#ccc',
        borderWidth: isEditable ? '2px' : '1px'
      }}
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
            {note.images.map((imageUrl: string, index: number) => (
              <NoteImage
                key={index}
                imageUrl={imageUrl}
                index={index}
                onDelete={isEditable ? () => handleDeleteImage(index) : () => {}}
              />
            ))}
          </div>
        )}
        
        <textarea
          data-note-id={note.id}
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
        
        {/* Opciones de edición solo para notas editables */}
        {isEditable && (
          <div className="note-actions-bottom">
            <div className="list-buttons">
              <button 
                className="list-button"
                onClick={(e) => {
                  e.stopPropagation();
                  insertList('bullet');
                }}
                title="Insertar lista con viñetas"
              >
                <i className="fas fa-list-ul"></i>
              </button>
              
              <button 
                className="list-button"
                onClick={(e) => {
                  e.stopPropagation();
                  insertList('number');
                }}
                title="Insertar lista numerada"
              >
                <i className="fas fa-list-ol"></i>
              </button>
              
              <button 
                className="list-button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(`shared-image-input-\${note.id}`)?.click();
                }}
                title="Insertar imagen"
              >
                <i className="fas fa-image"></i>
              </button>
              
              <input
                id={`shared-image-input-\${note.id}`}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </div>
          </div>
        )}
        
        {/* Indicador de guardado */}
        {isSaving && (
          <div className="saving-indicator">
            Guardando...
          </div>
        )}
        
        {/* Feedback local (si no se usa el global) */}
        {!showFeedback && feedback.message && (
          <div className={`note-feedback \${feedback.type}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedNoteCard;
