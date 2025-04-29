import { useState, useCallback, useEffect } from 'react';
import { noteService } from '../services/api';

export function useSharedNotes() {
  const [activeTab, setActiveTab] = useState<string>('my-notes');
  const [hasSharedNotes, setHasSharedNotes] = useState<boolean>(false);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSharedNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await noteService.getSharedNotes();
      setSharedNotes(data.sharedNotes);
    } catch (err) {
      console.error('Error al cargar notas compartidas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSharedNotes = useCallback(async () => {
    try {
      const data = await noteService.getSharedNotes();
      setHasSharedNotes(data.sharedNotes && data.sharedNotes.length > 0);
    } catch (err) {
      console.error('Error al verificar notas compartidas:', err);
    }
  }, []);

  const handleTabChange = useCallback((tabId: string, loadNotes: () => void) => {
    setActiveTab(tabId);
    if (tabId === 'my-notes') {
      loadNotes();
    } else if (tabId === 'shared-notes') {
      loadSharedNotes();
    }
  }, [loadSharedNotes]);

  // Verificar notas compartidas al inicio
  useEffect(() => {
    checkSharedNotes();
  }, [checkSharedNotes]);

  return {
    activeTab,
    hasSharedNotes,
    sharedNotes,
    isLoading,
    setActiveTab,
    loadSharedNotes,
    checkSharedNotes,
    handleTabChange
  };
}
