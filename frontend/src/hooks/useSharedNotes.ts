import { useState, useCallback, useEffect } from "react";
import { noteService } from "../services/api";

export function useSharedNotes() {
  const [activeTab, setActiveTab] = useState<string>("my-notes");
  const [hasSharedNotes, setHasSharedNotes] = useState<boolean>(false);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSharedNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await noteService.getSharedNotes();

      const transformedNotes = data.sharedNotes.map((note: any) => ({
        ...note,
        shared_note_id: note.id,
        id: note.id,
      }));

      setSharedNotes(transformedNotes);
    } catch (err) {
      console.error("Error al cargar notas compartidas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSharedNotes = useCallback(async () => {
    try {
      const data = await noteService.getSharedNotes();
      setHasSharedNotes(data.sharedNotes && data.sharedNotes.length > 0);
    } catch (err) {
      console.error("Error al verificar notas compartidas:", err);
    }
  }, []);

  const handleTabChange = useCallback(
    (tabId: string, loadNotes: () => void) => {
      setActiveTab(tabId);
      if (tabId === "my-notes") {
        loadNotes();
      } else if (tabId === "shared-notes") {
        loadSharedNotes();
      }
    },
    [loadSharedNotes]
  );

  const handleDeleteSharedImage = async (
    noteId: string,
    imageIndex: number
  ) => {
    try {
      const note = sharedNotes.find((n) => n.id === noteId);
      if (!note) return false;

      const updatedImages = [...(note.images || [])];
      updatedImages.splice(imageIndex, 1);

      await noteService.updateSharedNoteImages(noteId, updatedImages);

      // Actualizar el estado local inmediatamente
      setSharedNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === noteId ? { ...n, images: updatedImages } : n
        )
      );

      return true;
    } catch (error) {
      console.error("Error al eliminar imagen compartida:", error);
      return false;
    }
  };

  const handleAddSharedImage = async (noteId: string, file: File) => {
    try {
      // Crear el FormData para subir la imagen
      const formData = new FormData();
      formData.append("image", file);

      // Subir la imagen al servidor
      const response = await noteService.uploadNoteImage(formData);
      const imageUrl = response.data?.data?.imageUrl;

      if (!imageUrl) {
        throw new Error("No se pudo obtener la URL de la imagen subida");
      }

      // Obtener la nota actual
      const note = sharedNotes.find((n) => n.id === noteId);
      if (!note) return;

      // Añadir la nueva imagen a las existentes
      const updatedImages = [...(note.images || []), imageUrl];

      // Actualizar las imágenes en el servidor
      await noteService.updateSharedNoteImages(noteId, updatedImages);

      // Actualizar el estado local inmediatamente
      setSharedNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === noteId ? { ...n, images: updatedImages } : n
        )
      );

      return imageUrl;
    } catch (error) {
      console.error("Error al subir imagen compartida:", error);
      throw error;
    }
  };

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
    handleTabChange,
    handleDeleteSharedImage,
    handleAddSharedImage
  };
}
