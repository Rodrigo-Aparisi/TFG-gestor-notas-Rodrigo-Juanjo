import React, { useEffect } from 'react';
import '../styles/notes.css';
import { useNotes } from '../hooks/useNotes';
import { useGroups } from '../hooks/useNoteGroups';
import GroupSidebar from '../components/Notes/GroupSidebar';
import { FaTrash } from 'react-icons/fa';
import Masonry from 'react-masonry-css';
import NoteSort from '../components/Notes/NoteSort';

const Trash: React.FC = () => {
  // Hooks personalizados
  const {
    trashNotes,
    isLoading,
    loadTrashNotes,
    handleDeleteNote,
    handleRestoreNote,
    handleEmptyTrash,
  } = useNotes();

  const {
    groups,
    activeGroup,
    handleGroupSelect,
    handleDeleteGroup
  } = useGroups();

  // Cargar las notas de la papelera cuando se monta el componente
  useEffect(() => {
    loadTrashNotes();
  }, [loadTrashNotes]);

  // Crear una versión simplificada de NotesGrid para la papelera
  const TrashNotesGrid = () => {
    const breakpointColumns = {
      default: 5,
      1100: 3,
      768: 2,
      480: 1
    };

    return (
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {trashNotes.length > 0 ? (
          trashNotes.map(note => (
            <div key={note.id} className="note-card trash-note-card">
              <div className="note-content">
                <h3 className="font-semibold">{note.title}</h3>
                <p className="note-text">{note.content}</p>
                
                {note.images && note.images.length > 0 && (
                  <div className="note-images">
                    {note.images.map((imageUrl, index) => (
                      <img 
                        key={index} 
                        src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${imageUrl}`} 
                        alt="Nota" 
                        className="note-image" 
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-3">
                <span className="text-xs text-gray-500">
                  {new Date(note.deleted_at || note.updated_at).toLocaleDateString()}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRestoreNote(note.id)}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                  >
                    Restaurar
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notes">No hay notas en la papelera</div>
        )}
      </Masonry>
    );
  };

  return (
    <div className="notes-layout">
      {/* Sidebar */}
      <GroupSidebar 
        groups={groups}
        activeGroup={activeGroup}
        onGroupSelect={handleGroupSelect}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* Contenido principal */}
      <div className="notes-main">
        {/* Encabezado de la papelera */}
        <div className="active-group-header" style={{ color: '#e74c3c', borderBottom: '2px solid #e74c3c' }}>
          Papelera
        </div>
        
        {/* Añadimos un contenedor para herramientas similar a Notes.tsx */}
        <div className="note-tools-container">
          <div className="flex justify-between items-center w-full">
            <p className="text-red-500">
              Las notas que lleven más de 30 días en la papelera se eliminarán automáticamente.
            </p>
            
            <div className="flex items-center">
              {/* Añadimos un NoteSort vacío para mantener consistencia visual */}
              <div className="mr-4">
                <NoteSort 
                  notes={trashNotes}
                  onNotesFiltered={(filtered) => {}}
                />
              </div>
              
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center text-sm"
                disabled={trashNotes.length === 0}
              >
                <FaTrash className="mr-2" />
                Vaciar papelera
              </button>
            </div>
          </div>
        </div>

        {/* Grid de notas en papelera */}
        {isLoading ? (
          <div className="flex justify-center mt-10">
            <div className="loader"></div>
          </div>
        ) : (
          <TrashNotesGrid />
        )}
      </div>
    </div>
  );
};

export default Trash;
