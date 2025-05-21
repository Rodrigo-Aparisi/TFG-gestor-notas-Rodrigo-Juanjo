import { useCallback, useEffect } from 'react';

export function useTextareaResize() {
  const autoResizeTextarea = useCallback((element: HTMLTextAreaElement) => {
    if (!element) return;
    
    // Guarda la posición actual del scroll
    const scrollPos = element.scrollTop;
    
    // Resetea la altura para obtener la altura real del contenido
    element.style.height = 'auto';
    
    const isCreateNote = element.closest('.create-note');
    const parentNote = element.closest('.note-card');
    const isFocused = parentNote?.classList.contains('focused');
    
    if (isCreateNote) {
      // Para el textarea de crear nota
      element.style.height = 'auto';
      const newHeight = Math.min(element.scrollHeight, 200);
      element.style.height = `${newHeight}px`;
    } else if (isFocused) {
      // Para notas enfocadas
      element.style.height = 'auto';
      const maxHeight = Math.min(window.innerHeight * 0.6, element.scrollHeight);
      element.style.height = `${maxHeight}px`;
    } else {
      // Para notas normales
      element.style.height = 'auto';
      const newHeight = Math.min(element.scrollHeight, 500);
      element.style.height = `${newHeight}px`;
    }
    
    // Restaura la posición del scroll
    element.scrollTop = scrollPos;
  }, []);

  const resizeAllTextareas = useCallback(() => {
    const textareas = document.querySelectorAll('.note-card textarea');
    textareas.forEach((textarea) => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [autoResizeTextarea]);

  // Efecto para manejar el redimensionamiento de ventana
  useEffect(() => {
    window.addEventListener('resize', resizeAllTextareas);
    return () => {
      window.removeEventListener('resize', resizeAllTextareas);
    };
  }, [resizeAllTextareas]);

  return {
    autoResizeTextarea,
    resizeAllTextareas
  };
}
