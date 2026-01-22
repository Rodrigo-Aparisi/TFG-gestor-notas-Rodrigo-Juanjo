/**
 * NotesContext Tests
 *
 * Tests for the notes context provider and useNotesContext hook
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesProvider, useNotesContext } from '../NotesContext';

// Create mock context value
const createMockContextValue = (overrides = {}) => ({
  editingNote: {},
  markedNotes: [],
  activeGroup: 'all',
  groups: [],
  handleNoteChange: jest.fn(),
  handleUpdateNote: jest.fn().mockResolvedValue(undefined),
  handleDeleteNote: jest.fn().mockResolvedValue(undefined),
  handleToggleMark: jest.fn().mockResolvedValue(undefined),
  handleTogglePin: jest.fn().mockResolvedValue(undefined),
  handleImageUpload: jest.fn().mockResolvedValue(undefined),
  handleDeleteImage: jest.fn().mockResolvedValue(undefined),
  handleExportNote: jest.fn(),
  handleKeyDown: jest.fn(),
  insertList: jest.fn(),
  autoResizeTextarea: jest.fn(),
  focusedNoteId: null,
  sharingNoteId: null,
  setSharingNoteId: jest.fn(),
  handleFocus: jest.fn(),
  handleFocusIndicatorClick: jest.fn(),
  handleBlur: jest.fn(),
  ...overrides,
});

// Test component that uses the notes context
const TestComponent: React.FC = () => {
  const {
    activeGroup,
    markedNotes,
    focusedNoteId,
    handleDeleteNote,
    handleToggleMark,
    handleTogglePin,
    handleBlur,
  } = useNotesContext();

  return (
    <div>
      <span data-testid="activeGroup">{activeGroup}</span>
      <span data-testid="markedCount">{markedNotes.length}</span>
      <span data-testid="focusedNote">{focusedNoteId || 'none'}</span>
      <button
        data-testid="delete-btn"
        onClick={() => handleDeleteNote('note-1')}
      >
        Delete
      </button>
      <button
        data-testid="mark-btn"
        onClick={(e) => handleToggleMark('note-1', e)}
      >
        Mark
      </button>
      <button
        data-testid="pin-btn"
        onClick={(e) => handleTogglePin('note-1', e)}
      >
        Pin
      </button>
      <button
        data-testid="blur-btn"
        onClick={handleBlur}
      >
        Blur
      </button>
    </div>
  );
};

describe('NotesContext', () => {
  it('should provide context values to children', () => {
    const mockValue = createMockContextValue({
      activeGroup: 'work',
      markedNotes: ['note-1', 'note-2'],
    });

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    expect(screen.getByTestId('activeGroup')).toHaveTextContent('work');
    expect(screen.getByTestId('markedCount')).toHaveTextContent('2');
  });

  it('should call handleDeleteNote when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockValue = createMockContextValue();

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    await user.click(screen.getByTestId('delete-btn'));

    expect(mockValue.handleDeleteNote).toHaveBeenCalledWith('note-1');
    expect(mockValue.handleDeleteNote).toHaveBeenCalledTimes(1);
  });

  it('should call handleToggleMark when mark button is clicked', async () => {
    const user = userEvent.setup();
    const mockValue = createMockContextValue();

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    await user.click(screen.getByTestId('mark-btn'));

    expect(mockValue.handleToggleMark).toHaveBeenCalledWith('note-1', expect.any(Object));
    expect(mockValue.handleToggleMark).toHaveBeenCalledTimes(1);
  });

  it('should call handleTogglePin when pin button is clicked', async () => {
    const user = userEvent.setup();
    const mockValue = createMockContextValue();

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    await user.click(screen.getByTestId('pin-btn'));

    expect(mockValue.handleTogglePin).toHaveBeenCalledWith('note-1', expect.any(Object));
    expect(mockValue.handleTogglePin).toHaveBeenCalledTimes(1);
  });

  it('should call handleBlur when blur button is clicked', async () => {
    const user = userEvent.setup();
    const mockValue = createMockContextValue();

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    await user.click(screen.getByTestId('blur-btn'));

    expect(mockValue.handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should show focused note id when provided', () => {
    const mockValue = createMockContextValue({
      focusedNoteId: 'note-123',
    });

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    expect(screen.getByTestId('focusedNote')).toHaveTextContent('note-123');
  });

  it('should show "none" when no note is focused', () => {
    const mockValue = createMockContextValue({
      focusedNoteId: null,
    });

    render(
      <NotesProvider value={mockValue}>
        <TestComponent />
      </NotesProvider>
    );

    expect(screen.getByTestId('focusedNote')).toHaveTextContent('none');
  });

  it('should provide groups to children', () => {
    const mockGroups = [
      { id: 'group-1', name: 'Work', color: '#ff0000' },
      { id: 'group-2', name: 'Personal', color: '#00ff00' },
    ];

    const mockValue = createMockContextValue({
      groups: mockGroups,
    });

    // Test component that displays groups
    const GroupTestComponent: React.FC = () => {
      const { groups } = useNotesContext();
      return (
        <div>
          <span data-testid="groups-count">{groups.length}</span>
          {groups.map((g: { id: string; name: string }) => (
            <span key={g.id} data-testid={`group-${g.id}`}>{g.name}</span>
          ))}
        </div>
      );
    };

    render(
      <NotesProvider value={mockValue}>
        <GroupTestComponent />
      </NotesProvider>
    );

    expect(screen.getByTestId('groups-count')).toHaveTextContent('2');
    expect(screen.getByTestId('group-group-1')).toHaveTextContent('Work');
    expect(screen.getByTestId('group-group-2')).toHaveTextContent('Personal');
  });

  it('should throw error when useNotesContext is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotesContext must be used within a NotesProvider');

    consoleSpy.mockRestore();
  });
});
