import React, { useMemo } from 'react';
import { useEffect } from 'react';
import '../styles/notes.css';
import { useNotes } from '../hooks/useNotes';
import { useGroups } from '../hooks/useNoteGroups';
import { useSharedNotes } from '../hooks/useSharedNotes';
import { useUIEffects } from '../hooks/useUIEffects';
import { useTextareaResize } from '../hooks/useTextareaResize';
import { useTextEditor } from '../hooks/useTextEditor';
import { useGroupActions } from '../hooks/useGroupActions';
import { NotesProvider } from '../contexts/NotesContext';
import GroupSidebar from '../components/Notes/GroupSidebar';
import NotesContent from '../components/Notes/NotesContent';

const Notes: React.FC = () => {
  // Hooks personalizados
  const {
    notes,
    newNote,
    editingNote,
    markedNotes,
    filteredNotes,
    isLoading: notesLoading,
    sortKey,
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
    handleRemoveNoteFromGroup,
    handleUpdateGroup
  } = useGroups();

  const {
    activeTab,
    hasSharedNotes,
    sharedNotes,
    handleTabChange: handleTabChangeBase,
    handleDeleteSharedImage,
    handleAddSharedImage,
    handleExportSharedNote
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

  // Custom hooks for text editing and group actions
  const { handleKeyDown, insertList } = useTextEditor({
    setNewNote,
    handleNoteChange
  });

  const {
    editingGroup,
    setEditingGroup,
    handleEditGroup,
    handleSaveGroup,
    handleDeleteMarkedNotesWithClear,
    handleAddNotesToGroup,
    handleRemoveNotesFromGroup
  } = useGroupActions({
    markedNotes,
    setMarkedNotes,
    loadNotes,
    handleCreateGroup,
    handleUpdateGroup,
    handleAddNoteToGroup,
    handleRemoveNoteFromGroup,
    setShowGroupModal,
    setNoteNewGroup,
    newNoteGroup,
    handleDeleteMarkedNotes
  });

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    handleTabChangeBase(tabId, loadNotes);
  };

  // Overlay click handler for closing focused notes
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (focusedNoteId) {
      if (event.target === event.currentTarget) {
        handleBlur();
      }
    }
  };

  // Efecto para sincronizar notas marcadas solo cuando es necesario
  useEffect(() => {
    // Cuando cambia el grupo activo, actualiza las notas filtradas
    if (activeGroup === 'main') {
      // Solo actualizar si realmente hay un cambio
      if (JSON.stringify(filteredNotes) !== JSON.stringify(notes)) {
        handleFilteredNotes(notes);
      }
    } else {
      const currentGroup = groups.find(g => g.id === activeGroup);
      if (!currentGroup || !currentGroup.noteIds || currentGroup.noteIds.length === 0) {
        // Si el grupo está vacío o no existe, establecer notas filtradas como array vacío
        if (filteredNotes.length > 0) {
          handleFilteredNotes([]);
        }
      } else {
        // Filtrar las notas que pertenecen al grupo
        const groupNotes = notes.filter(note => 
          currentGroup.noteIds.includes(note.id.toString())
        );
        
        // Solo actualizar si realmente hay un cambio
        if (JSON.stringify(filteredNotes) !== JSON.stringify(groupNotes)) {
          handleFilteredNotes(groupNotes);
        }
      }
    }
  }, [activeGroup, groups, notes]);

  // Create context value for NotesProvider - eliminates prop drilling
  const notesContextValue = useMemo(() => ({
    // Shared state
    editingNote,
    markedNotes,
    activeGroup,
    groups,
    // Note manipulation
    handleNoteChange,
    handleUpdateNote,
    handleDeleteNote,
    handleToggleMark,
    handleTogglePin,
    // Image functions
    handleImageUpload,
    handleDeleteImage,
    // Export
    handleExportNote,
    // Text editing
    handleKeyDown,
    insertList,
    autoResizeTextarea,
    // UI state
    focusedNoteId,
    sharingNoteId,
    setSharingNoteId,
    handleFocus,
    handleFocusIndicatorClick,
    handleBlur
  }), [
    editingNote, markedNotes, activeGroup, groups,
    handleNoteChange, handleUpdateNote, handleDeleteNote, handleToggleMark, handleTogglePin,
    handleImageUpload, handleDeleteImage, handleExportNote,
    handleKeyDown, insertList, autoResizeTextarea,
    focusedNoteId, sharingNoteId, setSharingNoteId, handleFocus, handleFocusIndicatorClick, handleBlur
  ]);

  return (
    <NotesProvider value={notesContextValue}>
      <div className="notes-layout">
        {/* Sidebar */}
        <GroupSidebar
          groups={groups}
          activeGroup={activeGroup}
          onGroupSelect={handleGroupSelect}
          onDeleteGroup={handleDeleteGroup}
          onMoveGroup={handleMoveGroup}
          onEditGroup={handleEditGroup}
        />

        {/* Overlay for focused notes */}
        <div
          className={`overlay ${focusedNoteId ? 'active' : ''}`}
          onClick={handleOverlayClick}
        />

        {/* Main content */}
        <NotesContent
          // Tab state
          activeTab={activeTab}
          hasSharedNotes={hasSharedNotes}
          onTabChange={handleTabChange}
          // Group state
          activeGroup={activeGroup}
          groups={groups}
          // Marked notes
          markedNotes={markedNotes}
          onShowGroupModal={() => setShowGroupModal(true)}
          onDeleteMarkedNotes={handleDeleteMarkedNotesWithClear}
          onAddToGroup={handleAddNotesToGroup}
          onRemoveFromGroup={handleRemoveNotesFromGroup}
          // Note creation
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
          // Notes data
          notes={notes}
          filteredNotes={filteredNotes}
          sortKey={sortKey}
          onNotesFiltered={handleFilteredNotes}
          // Shared notes
          sharedNotes={sharedNotes}
          focusedNoteId={focusedNoteId}
          handleFocus={handleFocus}
          handleFocusIndicatorClick={handleFocusIndicatorClick}
          handleDeleteSharedImage={handleDeleteSharedImage}
          handleAddSharedImage={handleAddSharedImage}
          handleExportSharedNote={handleExportSharedNote}
          // Modal
          showGroupModal={showGroupModal}
          editingGroup={editingGroup}
          newNoteGroup={newNoteGroup}
          setNoteNewGroup={setNoteNewGroup}
          setEditingGroup={setEditingGroup}
          setShowGroupModal={setShowGroupModal}
          onSaveGroup={handleSaveGroup}
        />
      </div>
    </NotesProvider>
  );
};

export default Notes;
