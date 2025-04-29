import React from 'react';
import '../styles/notes.css';
import { useNotes } from '../hooks/useNotes';
import { useGroups } from '../hooks/useGroups';
import { useSharedNotes } from '../hooks/useSharedNotes';
import { useUIEffects } from '../hooks/useUIEffects';
import { useTextareaResize } from '../hooks/useTextareaResize';
import NoteTabs from '../components/Notes/NoteTabs';
import GroupSidebar from '../components/Notes/GroupSidebar';
import BulkActionsMenu from '../components/Notes/BulkActionsMenu';
import CreateNoteForm from '../components/Notes/CreateNoteForm';
import GroupModal from '../components/Notes/GroupModal';
import NotesGrid from '../components/Notes/NotesGrid';
import SharedNotesGrid from '../components/Notes/SharedNotesGrid';
import NoteSort from '../components/Notes/NoteSort';

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
    handleFilteredNotes
  } = useNotes();

  const {
    autoResizeTextarea
  } = useTextareaResize();

  const {
    groups,
    activeGroup,
    showGroupModal,
    newGroup,
    handleGroupSelect,
    handleCreateGroup,
    handleDeleteGroup,
    setShowGroupModal,
    setNewGroup
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

  // Función para manejar cambio de pestañas
  const handleTabChange = (tabId: string) => {
    handleTabChangeBase(tabId, loadNotes);
  };

  // Función para manejar la creación de grupos
  const handleCreateGroupWithMarkedNotes = async () => {
    const result = await handleCreateGroup(markedNotes);
    if (result) {
      setMarkedNotes([]);
    }
  };

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
    let currentContent;
    if (isNewNote) {
      currentContent = newNote.content;
    } else {
      // Usar el contenido del estado de edición si existe, si no usar el contenido original de la nota
      const note = notes.find(n => n.id === noteId);
      currentContent = editingNote[noteId]?.content ?? note?.content ?? '';
    }
  
    const selectionStart = document.activeElement instanceof HTMLTextAreaElement ? 
      document.activeElement.selectionStart : currentContent.length;
    
    let insertText = '\n';
    if (type === 'bullet') {
      insertText += '• ';
    } else {
      insertText += '1. ';
    }
  
    const newContent = currentContent.slice(0, selectionStart) + 
                      insertText + 
                      currentContent.slice(selectionStart);
  
    if (isNewNote) {
      setNewNote(prev => ({ ...prev, content: newContent }));
    } else {
      handleNoteChange(noteId, 'content', newContent);
    }
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
          onShowGroupModal={() => setShowGroupModal(true)}
          onDeleteMarkedNotes={handleDeleteMarkedNotes}
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
            newGroup={newGroup}
            setNewGroup={setNewGroup}
            onClose={() => setShowGroupModal(false)}
            onCreateGroup={handleCreateGroupWithMarkedNotes}
          />
        )}
      </div>
    </div>
  );
};

export default Notes;
