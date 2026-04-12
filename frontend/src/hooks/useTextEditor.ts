import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseTextEditorProps {
  setNewNote: React.Dispatch<React.SetStateAction<{ title: string; content: string }>>;
  handleNoteChange: (id: string, field: 'title' | 'content', value: string) => void;
}

interface UseTextEditorReturn {
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string, isNewNote?: boolean) => void;
  insertList: (noteId: string, type: 'bullet' | 'number', isNewNote?: boolean) => void;
}

/**
 * Custom hook for text editor functionality in notes
 * Handles keyboard shortcuts (Enter for lists, Tab for indentation) and list insertion
 */
export const useTextEditor = ({
  setNewNote,
  handleNoteChange
}: UseTextEditorProps): UseTextEditorReturn => {

  // Handle keyboard events in textareas (Enter for list continuation, Tab for indentation)
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    noteId: string,
    isNewNote = false
  ) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const content = textarea.value;
      const lines = content.split('\n');
      let currentLine = '';
      let charCount = 0;

      // Find current line
      for (const line of lines) {
        if (charCount + line.length + 1 >= selectionStart) {
          currentLine = line;
          break;
        }
        charCount += line.length + 1;
      }

      // Detect if we're in a list
      const bulletMatch = currentLine.match(/^(\s*)([•\-*]|\d+\.)\s*/);
      if (bulletMatch) {
        e.preventDefault();

        const [, indent, bullet] = bulletMatch;

        // If line is empty (except for marker), end the list
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

        // Continue list with same indentation
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

      // Insert tab (4 spaces)
      const newContent = content.slice(0, selectionStart) +
        '    ' +
        content.slice(selectionStart);

      if (isNewNote) {
        setNewNote(prev => ({ ...prev, content: newContent }));
      } else {
        handleNoteChange(noteId, 'content', newContent);
      }

      // Move cursor after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      });
    }
  }, [setNewNote, handleNoteChange]);

  // Insert bullet or numbered list
  const insertList = useCallback((
    noteId: string,
    type: 'bullet' | 'number',
    isNewNote = false
  ) => {
    // Find the textarea element
    let textarea: HTMLTextAreaElement | null = null;

    if (isNewNote) {
      textarea = document.querySelector('.create-note textarea') as HTMLTextAreaElement;
    } else {
      // Try to find by data-note-id
      textarea = document.querySelector(`textarea[data-note-id="${noteId}"]`) as HTMLTextAreaElement;

      // If not found, search in container with data-note-id
      if (!textarea) {
        const noteContainer = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteContainer) {
          textarea = noteContainer.querySelector('textarea') as HTMLTextAreaElement;
        }
      }

      // Try focused note
      if (!textarea) {
        const focusedNote = document.querySelector('.note-card.focused');
        if (focusedNote) {
          textarea = focusedNote.querySelector('textarea') as HTMLTextAreaElement;
        }
      }

      // Last resort: single visible textarea
      if (!textarea) {
        const visibleTextareas = document.querySelectorAll('textarea:not([style*="display: none"])');
        if (visibleTextareas.length === 1) {
          textarea = visibleTextareas[0] as HTMLTextAreaElement;
        }
      }
    }

    if (!textarea) {
      console.error(`Could not find textarea for note ${noteId}`);
      toast.error('Error al insertar lista');
      return;
    }

    const content = textarea.value;
    const selectionStart = textarea.selectionStart;

    // Find current line
    const textBeforeCursor = content.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLine = lines[currentLineIndex] || '';

    // Determine if at beginning of textarea or line
    const isAtBeginning = selectionStart === 0;
    const isAtLineStart = currentLine.trim() === '';

    let insertText = '';

    // Only add newline if not at beginning or line start
    if (!isAtBeginning && !isAtLineStart) {
      insertText += '\n';
    }

    if (type === 'bullet') {
      insertText += '• ';
    } else if (type === 'number') {
      // Search for previous numbered lines
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

      if (lastNumberedLine !== -1) {
        const nextNumber = lastNumber + (currentLineIndex - lastNumberedLine);
        insertText += `${nextNumber + 1}. `;
      } else {
        insertText += '1. ';
      }
    }

    const newContent = content.substring(0, selectionStart) + insertText + content.substring(selectionStart);

    // Check if it's a shared note
    const isSharedNote = document.querySelector('.note-card.focused.editable-note') !== null;

    if (isSharedNote) {
      // For shared notes, update textarea directly and dispatch events
      textarea.value = newContent;

      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      const changeEvent = new Event('change', { bubbles: true });
      textarea.dispatchEvent(changeEvent);

      // Try to update React state for controlled components
      const reactInstance = (textarea as unknown as { _reactProps?: { onChange?: (e: unknown) => void } })._reactProps;
      if (reactInstance && reactInstance.onChange) {
        const syntheticEvent = {
          target: textarea,
          currentTarget: textarea,
          preventDefault: () => {},
          stopPropagation: () => {}
        };
        reactInstance.onChange(syntheticEvent);
      }
    } else {
      // For normal or new notes, use normal flow
      if (isNewNote) {
        setNewNote(prev => ({ ...prev, content: newContent }));
      } else {
        handleNoteChange(noteId, 'content', newContent);
      }
    }

    // Move cursor after inserted text
    const newPosition = selectionStart + insertText.length;
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [setNewNote, handleNoteChange]);

  return {
    handleKeyDown,
    insertList
  };
};

export default useTextEditor;
