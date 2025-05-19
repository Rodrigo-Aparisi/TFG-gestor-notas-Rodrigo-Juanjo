import React from 'react';
import { useEffect, useState } from 'react';
import '../styles/notes.css';
import { useNotes } from '../hooks/useNotes';
import { useGroups } from '../hooks/useNoteGroups';
import { useSharedNotes } from '../hooks/useSharedNotes';
import { useUIEffects } from '../hooks/useUIEffects';
import { useTextareaResize } from '../hooks/useTextareaResize';
import { noteService } from '../services/api';
import NoteTabs from '../components/Notes/NoteTabs';
import GroupSidebar from '../components/Notes/GroupSidebar';
import BulkActionsMenu from '../components/Notes/BulkActionsMenu';
import CreateNoteForm from '../components/Notes/CreateNoteForm';
import GroupModal from '../components/Notes/GroupModal';
import NotesGrid from '../components/Notes/NotesGrid';
import SharedNotesGrid from '../components/Notes/SharedNotesGrid';
import NoteSort from '../components/Notes/NoteSort';
import { useLocation } from 'react-router-dom';

const Notes: React.FC = () => {
  // Hooks personalizados
  const {
    notes,
    newNote,
    editingNote,
    markedNotes,
    filteredNotes,
    isLoading: notesLoading,
    feedback,
    sortKey,
    showFeedback,
    loadNotes,
    handleCreateNote,
    handleNoteChange,
    handleUpdateNote,
    handleImageUpload,
    handleDeleteImage,
    handleDeleteNote,
    handleDeleteMarkedNotes,
    handleToggleMark,
    handleTogglePin,
    setNewNote,
    setMarkedNotes,
    handleFilteredNotes,
    handleExportNote
  } = useNotes();

  const {
    autoResizeTextarea
  } = useTextareaResize();

  const {
    groups,
    activeGroup,
    showGroupModal,
    newNoteGroup,
    handleGroupSelect,
    handleCreateGroup,
    handleDeleteGroup,
    setShowGroupModal,
    setNoteNewGroup,
    handleMoveGroup,
    handleAddNoteToGroup,
    handleRemoveNoteFromGroup
  } = useGroups(showFeedback);

  const {
    activeTab,
    hasSharedNotes,
    sharedNotes,
    handleTabChange: handleTabChangeBase
  } = useSharedNotes();

  const {
    focusedNoteId,
    sharingNoteId,
    isExpanded,
    handleFocus,
    handleBlur,
    handleFocusIndicatorClick,
    setSharingNoteId,
    setIsExpanded
  } = useUIEffects();

  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [shouldSyncMarkedNotes, setShouldSyncMarkedNotes] = useState(true);

  // Función para manejar cambio de pestañas
  const handleTabChange = (tabId: string) => {
    handleTabChangeBase(tabId, loadNotes);
  };

  // Función para manejar la creación de grupos con notas marcadas
  const handleCreateGroupWithMarkedNotes = async () => {
    const result = await handleCreateGroup(markedNotes);
    if (result) {
      setMarkedNotes([]); // Desmarcar todas las notas después de crear el grupo
    }
  };

  // Función para manejar la eliminación de notas marcadas
  const handleDeleteMarkedNotesWithClear = async () => {
    try {
      await handleDeleteMarkedNotes();
      setMarkedNotes([]); // Forzar el reseteo de las notas marcadas
    } catch (error) {
      console.error('Error al eliminar notas marcadas:', error);
    }
  };

  // Función para añadir notas marcadas a un grupo
  const handleAddNotesToGroup = async (groupId: string) => {
    try {
      // Crear un array de promesas para añadir cada nota al grupo
      const addPromises = markedNotes.map(noteId => 
        handleAddNoteToGroup(groupId, noteId)
      );
      
      // Esperar a que todas las promesas se resuelvan
      await Promise.all(addPromises);
      
      // Mostrar feedback
      showFeedback(`Notas añadidas al grupo exitosamente`);
      
      // Importante: limpiar las notas marcadas
      setMarkedNotes([]);
      
      // Recargar las notas para actualizar la UI
      loadNotes();
    } catch (error) {
      console.error('Error al añadir notas al grupo:', error);
      showFeedback('Error al añadir notas al grupo');
    }
  };

  // Eliminar notas de un grupo
  const handleRemoveNotesFromGroup = async (groupId: string) => {
    try {
      // Crear un array de promesas para eliminar cada nota del grupo
      const removePromises = markedNotes.map(noteId => 
        handleRemoveNoteFromGroup(groupId, noteId)
      );
      
      // Esperar a que todas las promesas se resuelvan
      await Promise.all(removePromises);
      
      // Mostrar feedback
      showFeedback(`Notas eliminadas del grupo exitosamente`);
      
      // Limpiar las notas marcadas
      setMarkedNotes([]);
      
      // Recargar notas para actualizar la vista
      loadNotes();
    } catch (error) {
      console.error('Error al eliminar notas del grupo:', error);
      showFeedback('Error al eliminar notas del grupo');
    }
  };

  // Efecto para sincronizar notas marcadas solo cuando es necesario
  useEffect(() => {
    if (shouldSyncMarkedNotes) {
      // Identificar notas que están marcadas según su propiedad is_marked
      const markedNoteIds = notes
        .filter(note => note.is_marked)
        .map(note => note.id);
      
      // Actualizar el estado
      setMarkedNotes(markedNoteIds);
      setShouldSyncMarkedNotes(false);
    }
  }, [notes, shouldSyncMarkedNotes]);

  // Actualiza este efecto para que se ejecute cuando cambie el grupo activo
  useEffect(() => {
    setShouldSyncMarkedNotes(true); // Esto forzará la sincronización cuando cambie el grupo
  }, [activeGroup]);

  // Función para manejar teclas en textareas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote = false) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;
      const lines = content.split('\n');
      let currentLine = '';
      let charCount = 0;
      let indentLevel = 0;
      
      // Encontrar la línea actual y su nivel de indentación
      for (const line of lines) {
        if (charCount + line.length + 1 >= selectionStart) {
          currentLine = line;
          indentLevel = (line.match(/^\s*/) || [''])[0].length;
          break;
        }
        charCount += line.length + 1;
      }
  
      // Detectar si estamos en una lista
      const bulletMatch = currentLine.match(/^(\s*)([•\-*]|\d+\.)\s*/);
      if (bulletMatch) {
        e.preventDefault();
        
        const [, indent, bullet] = bulletMatch;
        
        // Si la línea está vacía (excepto por el marcador), terminar la lista
        if (currentLine.trim() === bullet.trim()) {
          const newContent = content.slice(0, selectionStart - bulletMatch[0].length) + 
                           '\n' + content.slice(selectionStart);
          
          if (isNewNote) {
            setNewNote(prev => ({ ...prev, content: newContent }));
          } else {
            handleNoteChange(noteId, 'content', newContent);
          }
          return;
        }
  
        // Continuar la lista con la misma indentación
        const newBullet = bullet.match(/\d+\./) 
          ? `${parseInt(bullet) + 1}.` 
          : '•';
        
        const newContent = content.slice(0, selectionStart) + 
                          '\n' + indent + newBullet + ' ' + 
                          content.slice(selectionStart);
        
        if (isNewNote) {
          setNewNote(prev => ({ ...prev, content: newContent }));
        } else {
          handleNoteChange(noteId, 'content', newContent);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;
      
      // Insertar tabulación
      const newContent = content.slice(0, selectionStart) + 
                        '    ' + // 4 espacios para la tabulación
                        content.slice(selectionStart);
      
      if (isNewNote) {
        setNewNote(prev => ({ ...prev, content: newContent }));
      } else {
        handleNoteChange(noteId, 'content', newContent);
      }
      
      // Mover el cursor después de la tabulación
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      });
    }
  };

  // Función para insertar listas
  const insertList = (noteId: string, type: 'bullet' | 'number', isNewNote = false) => {
    // Primero, intentamos obtener el textarea directamente por ID
    let textarea: HTMLTextAreaElement | null = null;
    
    if (isNewNote) {
      textarea = document.querySelector('.create-note textarea') as HTMLTextAreaElement;
    } else {
      // Para notas existentes, buscamos el textarea dentro del contenedor de la nota
      const noteContainer = document.querySelector(`[data-note-id="${noteId}"]`);
      if (noteContainer) {
        textarea = noteContainer.querySelector('textarea') as HTMLTextAreaElement;
      }
    }
    
    if (!textarea) {
      console.error(`No se pudo encontrar el textarea para la nota ${noteId}`);
      showFeedback('Error al insertar lista');
      return;
    }
    
    const content = textarea.value;
    const selectionStart = textarea.selectionStart;
    
    // Encontrar la línea actual y la anterior
    const textBeforeCursor = content.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    
    let insertText = '\n';
    
    if (type === 'bullet') {
      insertText += '• ';
    } else if (type === 'number') {
      // Buscar en todas las líneas anteriores, no solo la inmediata
      let lastNumberedLine = -1;
      let lastNumber = 0;
      
      for (let i = currentLineIndex; i >= 0; i--) {
        const line = lines[i];
        const numberMatch = line.match(/^(\s*)(\d+)\.(\s+)/);
        
        if (numberMatch) {
          lastNumberedLine = i;
          lastNumber = parseInt(numberMatch[2]);
          break;
        }
      }
      
      // Si encontramos una línea numerada
      if (lastNumberedLine !== -1) {
        // Calcular el número correcto basado en la posición relativa
        const nextNumber = lastNumber + (currentLineIndex - lastNumberedLine);
        insertText += `${nextNumber + 1}. `;
      } else {
        // Si no hay línea numerada previa, comenzar en 1
        insertText += '1. ';
      }
    }
    
    const newContent = content.substring(0, selectionStart) + insertText + content.substring(selectionStart);
    
    // Actualizar el contenido
    if (isNewNote) {
      setNewNote(prev => ({ ...prev, content: newContent }));
    } else {
      handleNoteChange(noteId, 'content', newContent);
    }
    
    // Mover el cursor después del texto insertado
    const newPosition = selectionStart + insertText.length;
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };


  return (
    <div className="notes-layout">
      {/* Sidebar */}
      <GroupSidebar 
        groups={groups}
        activeGroup={activeGroup}
        onGroupSelect={handleGroupSelect}
        onDeleteGroup={handleDeleteGroup}
        onMoveGroup={handleMoveGroup}
      />

      {/* Contenido principal */}
      <div className="notes-main">
        <NoteTabs 
          activeTab={activeTab}
          hasSharedNotes={hasSharedNotes}
          onTabChange={handleTabChange}
        />
        
        {feedback && <div className="feedback-message">{feedback}</div>}
        
        {/* Encabezado del grupo activo */}
        {activeGroup && (
          <div className="active-group-header" style={{
            color: groups.find(g => g.id === activeGroup)?.color || '#f1c40f'
          }}>
            {groups.find(g => g.id === activeGroup)?.name || 'Todas las notas'}
          </div>
        )}

        {/* Menú de acciones en masa */}
        <BulkActionsMenu 
          markedNotes={markedNotes}
          groups={groups}
          activeGroup={activeGroup}
          onShowGroupModal={() => setShowGroupModal(true)}
          onDeleteMarkedNotes={handleDeleteMarkedNotesWithClear}
          onAddToGroup={handleAddNotesToGroup}
          onRemoveFromGroup={handleRemoveNotesFromGroup}
        />

        {/* Crear nota */}
        {activeTab === 'my-notes' && (
          <div className="note-tools-container">
            <CreateNoteForm 
              newNote={newNote}
              isExpanded={isExpanded}
              isLoading={notesLoading}
              setNewNote={setNewNote}
              setIsExpanded={setIsExpanded}
              handleCreateNote={handleCreateNote}
              handleKeyDown={handleKeyDown}
              insertList={insertList}
              handleImageUpload={handleImageUpload}
              autoResizeTextarea={autoResizeTextarea}
              handleExportNote={handleExportNote}
            />
            
            <NoteSort 
              key={`note-sort-${sortKey}`}
              notes={activeGroup === 'main' ? notes : notes.filter(note => {
                const currentGroup = groups.find(g => g.id === activeGroup);
                return currentGroup && Array.isArray(currentGroup.noteIds) && 
                  currentGroup.noteIds.includes(note.id.toString());
              })}
              onNotesFiltered={handleFilteredNotes}
            />
          </div>
        )}

        {/* Grid de notas */}
        {activeTab === 'my-notes' ? (
          <NotesGrid
            notes={filteredNotes}
            editingNote={editingNote}
            focusedNoteId={focusedNoteId}
            sharingNoteId={sharingNoteId}
            markedNotes={markedNotes}
            activeGroup={activeGroup}
            groups={groups}
            handleNoteChange={handleNoteChange}
            handleUpdateNote={handleUpdateNote}
            handleFocus={handleFocus}
            handleFocusIndicatorClick={handleFocusIndicatorClick}
            handleToggleMark={handleToggleMark}
            handleTogglePin={handleTogglePin}
            setSharingNoteId={setSharingNoteId}
            handleKeyDown={handleKeyDown}
            insertList={insertList}
            handleDeleteNote={handleDeleteNote}
            autoResizeTextarea={autoResizeTextarea}
            handleImageUpload={handleImageUpload}
            handleDeleteImage={handleDeleteImage}
            handleExportNote={handleExportNote}
          />
        ) : (
          <SharedNotesGrid
            sharedNotes={sharedNotes}
            focusedNoteId={focusedNoteId}
            handleFocus={handleFocus}
            handleFocusIndicatorClick={handleFocusIndicatorClick}
            autoResizeTextarea={autoResizeTextarea}
          />
        )}

        {/* Modal de creación de grupo */}
        {showGroupModal && (
          <GroupModal
            newGroup={newNoteGroup}
            setNewGroup={setNoteNewGroup}
            onClose={() => setShowGroupModal(false)}
            onCreateGroup={handleCreateGroupWithMarkedNotes}
          />
        )}
      </div>
    </div>
  );
};

export default Notes;
