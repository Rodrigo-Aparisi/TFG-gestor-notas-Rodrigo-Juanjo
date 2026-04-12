import { useState, useCallback, useEffect } from 'react';
import { NotePosition } from '../types';

export function useUIEffects() {
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notePositions, setNotePositions] = useState<{[key: string]: NotePosition}>({});

  const getColumnPosition = useCallback((element: HTMLElement): 'left' | 'right' => {
    const columnIndex = Array.from(element.closest('.masonry-grid')?.children || [])
      .findIndex(col => col.contains(element));
    const totalColumns = 5; // breakpointColumns.default
    
    // Si está en las dos primeras columnas, considerarlo 'left'
    return columnIndex < totalColumns / 2 ? 'left' : 'right';
  }, []);

  const handleFocus = useCallback((id: string, event: React.MouseEvent<HTMLDivElement>) => {
    const noteElement = event.currentTarget;
    const rect = noteElement.getBoundingClientRect();
    const columnPosition = getColumnPosition(noteElement);
    
    // Establecer las propiedades CSS iniciales
    noteElement.style.setProperty('--original-width', `${rect.width}px`);
    noteElement.style.setProperty('--original-height', `${rect.height}px`);
    noteElement.style.setProperty('--original-top', `${rect.top}px`);
    noteElement.style.setProperty('--original-left', `${rect.left}px`);
    
    setNotePositions(prev => ({
      ...prev,
      [id]: { rect, columnPosition }
    }));
    
    noteElement.classList.add('focusing');
    noteElement.setAttribute('data-column-position', columnPosition);
    
    // Usar requestAnimationFrame para asegurar que las propiedades CSS se apliquen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        noteElement.classList.add('focused');
      });
    });
    
    setFocusedNoteId(id);
    document.body.style.overflow = 'hidden';
  }, [getColumnPosition]);

  const handleBlur = useCallback(() => {
    const focusedNote = document.querySelector('.note-card.focused');
    if (focusedNote) {
      const id = focusedNoteId as string;
      const position = notePositions[id];
      
      if (position) {
        const element = focusedNote as HTMLElement;
        
        // Restaurar las propiedades originales
        element.style.setProperty('--original-width', `${position.rect.width}px`);
        element.style.setProperty('--original-height', `${position.rect.height}px`);
        element.style.setProperty('--original-top', `${position.rect.top}px`);
        element.style.setProperty('--original-left', `${position.rect.left}px`);
        
        element.classList.remove('focused');
        
        setTimeout(() => {
          element.classList.remove('focusing');
          element.removeAttribute('data-column-position');
          element.style.removeProperty('--original-width');
          element.style.removeProperty('--original-height');
          element.style.removeProperty('--original-top');
          element.style.removeProperty('--original-left');
        }, 300);
      }
    }
    
    // Resetear el sharingNoteId cuando se minimiza la nota
    setSharingNoteId(null);
    
    setFocusedNoteId(null);
    document.body.style.overflow = '';
  }, [focusedNoteId, notePositions]);

  const handleFocusIndicatorClick = useCallback((event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (focusedNoteId === id) {
      handleBlur();
    } else {
      setFocusedNoteId(id);
      document.body.style.overflow = 'hidden';
    }
  }, [focusedNoteId, handleBlur]);

  // Limpiar posiciones cuando se quita el foco
  useEffect(() => {
    if (!focusedNoteId) {
      setNotePositions({});
    }
  }, [focusedNoteId]);

  // Restaurar overflow al desmontar para evitar que el scroll quede bloqueado
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    focusedNoteId,
    sharingNoteId,
    isExpanded,
    isLoading,
    notePositions,
    setFocusedNoteId,
    setSharingNoteId,
    setIsExpanded,
    setIsLoading,
    handleFocus,
    handleBlur,
    handleFocusIndicatorClick,
    getColumnPosition
  };
}
