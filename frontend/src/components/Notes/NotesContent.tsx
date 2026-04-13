import React from 'react';
import { Note, Group, SharedNote } from '../../types';
import NoteTabs from './NoteTabs';
import BulkActionsMenu from './BulkActionsMenu';
import CreateNoteForm from './CreateNoteForm';
import NotesGrid from './NotesGrid';
import SharedNotesGrid from './SharedNotesGrid';
import NoteSort from './NoteSort';
import GroupModal from './GroupModal';

interface NotesContentProps {
  // Tab state
  activeTab: string;
  hasSharedNotes: boolean;
  onTabChange: (tabId: string) => void;


  // Group state
  activeGroup: string;
  groups: Group[];

  // Marked notes actions
  markedNotes: string[];
  onShowGroupModal: () => void;
  onDeleteMarkedNotes: () => Promise<void>;
  onAddToGroup: (groupId: string) => Promise<void>;
  onRemoveFromGroup: (groupId: string) => Promise<void>;

  // Note creation
  newNote: { title: string; content: string };
  isExpanded: boolean;
  isLoading: boolean;
  setNewNote: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateNote: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote?: boolean) => void;
  insertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => Promise<void>;
  autoResizeTextarea: (element: HTMLTextAreaElement) => void;
  handleExportNote: (format: string, noteId?: string) => void;

  // Notes data
  notes: Note[];
  filteredNotes: Note[];
  sortKey: number;
  onNotesFiltered: (notes: Note[]) => void;

  // Shared notes
  sharedNotes: SharedNote[];
  focusedNoteId: string | null;
  handleFocus: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleFocusIndicatorClick: (event: React.MouseEvent, id: string) => void;
  handleDeleteSharedImage: (sharedNoteId: string, imageIndex: number) => Promise<void>;
  handleAddSharedImage: (e: React.ChangeEvent<HTMLInputElement>, sharedNoteId: string) => Promise<void>;
  handleExportSharedNote: (format: string, sharedNoteId: string) => void;

  // Modal state
  showGroupModal: boolean;
  editingGroup: Group | null;
  newNoteGroup: { name: string; color: string };
  setNoteNewGroup: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  setEditingGroup: React.Dispatch<React.SetStateAction<Group | null>>;
  setShowGroupModal: React.Dispatch<React.SetStateAction<boolean>>;
  onSaveGroup: () => Promise<void>;
}

/**
 * NotesContent - Main content area of the Notes page
 * Contains tabs, note creation form, note grids, and group modal
 */
const NotesContent: React.FC<NotesContentProps> = ({
  // Tab state
  activeTab,
  hasSharedNotes,
  onTabChange,
  // Group state
  activeGroup,
  groups,
  // Marked notes
  markedNotes,
  onShowGroupModal,
  onDeleteMarkedNotes,
  onAddToGroup,
  onRemoveFromGroup,
  // Note creation
  newNote,
  isExpanded,
  isLoading,
  setNewNote,
  setIsExpanded,
  handleCreateNote,
  handleKeyDown,
  insertList,
  handleImageUpload,
  autoResizeTextarea,
  handleExportNote,
  // Notes data
  notes,
  filteredNotes,
  sortKey,
  onNotesFiltered,
  // Shared notes
  sharedNotes,
  focusedNoteId,
  handleFocus,
  handleFocusIndicatorClick,
  handleDeleteSharedImage,
  handleAddSharedImage,
  handleExportSharedNote,
  // Modal
  showGroupModal,
  editingGroup,
  newNoteGroup,
  setNoteNewGroup,
  setEditingGroup,
  setShowGroupModal,
  onSaveGroup
}) => {
  // Get notes for current group
  const getNotesForGroup = (notesList: Note[]) => {
    if (activeGroup === 'main') return notesList;

    const currentGroup = groups.find(g => g.id === activeGroup);
    if (!currentGroup || !Array.isArray(currentGroup.noteIds)) return [];

    return notesList.filter(note =>
      currentGroup.noteIds.includes(note.id.toString())
    );
  };

  // Close modal handler
  const handleCloseModal = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    setNoteNewGroup({ name: '', color: '#f1c40f' });
  };

  return (
    <div className="notes-main">
      {/* Zona de feedback accesible para lectores de pantalla */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading ? 'Cargando notas...' : ''}
      </div>

      {/* Tabs */}
      <NoteTabs
        activeTab={activeTab}
        hasSharedNotes={hasSharedNotes}
        onTabChange={onTabChange}
      />

      {/* Active group header */}
      {activeGroup && (
        <div
          className="active-group-header"
          style={{ color: groups.find(g => g.id === activeGroup)?.color || '#f1c40f' }}
        >
          {groups.find(g => g.id === activeGroup)?.name || 'Todas las notas'}
        </div>
      )}

      {/* Bulk actions menu */}
      <BulkActionsMenu
        markedNotes={markedNotes}
        groups={groups}
        activeGroup={activeGroup}
        onShowGroupModal={onShowGroupModal}
        onDeleteMarkedNotes={onDeleteMarkedNotes}
        onAddToGroup={onAddToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
      />

      {/* Note creation form (only for my-notes tab) */}
      {activeTab === 'my-notes' && (
        <div className="note-tools-container">
          <CreateNoteForm
            newNote={newNote}
            isExpanded={isExpanded}
            isLoading={isLoading}
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
            notes={getNotesForGroup(notes)}
            onNotesFiltered={onNotesFiltered}
          />
        </div>
      )}

      {/* Notes grid */}
      {activeTab === 'my-notes' ? (
        <NotesGrid notes={getNotesForGroup(filteredNotes)} isLoading={isLoading} />
      ) : (
        <SharedNotesGrid
          sharedNotes={sharedNotes}
          focusedNoteId={focusedNoteId}
          handleFocus={handleFocus}
          handleFocusIndicatorClick={handleFocusIndicatorClick}
          autoResizeTextarea={autoResizeTextarea}
          insertList={insertList}
          handleDeleteSharedImage={handleDeleteSharedImage}
          handleAddSharedImage={handleAddSharedImage}
          handleExportSharedNote={handleExportSharedNote}
        />
      )}

      {/* Group modal */}
      {showGroupModal && (
        <GroupModal
          isEdit={!!editingGroup}
          group={editingGroup || undefined}
          newGroup={newNoteGroup}
          setNewGroup={setNoteNewGroup}
          onClose={handleCloseModal}
          onCreateGroup={onSaveGroup}
          onUpdateGroup={undefined}
        />
      )}
    </div>
  );
};

export default NotesContent;
