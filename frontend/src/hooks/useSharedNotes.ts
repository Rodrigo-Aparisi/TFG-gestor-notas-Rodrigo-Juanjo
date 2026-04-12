import { useState, useCallback, useEffect } from "react";
import { noteService } from "../services/api";
import { SharedNote } from "../types";
import { exportAsPDF as exportAsPDFHelper } from "../utils/exportHelpers";

export function useSharedNotes() {
  const [activeTab, setActiveTab] = useState<string>("my-notes");
  const [hasSharedNotes, setHasSharedNotes] = useState<boolean>(false);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSharedNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await noteService.getSharedNotes();

      const transformedNotes = data.sharedNotes.map((note: SharedNote) => ({
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

  const handleExportSharedNote = (
    format: string,
    noteData: string | SharedNote
  ) => {
    // Si recibimos un string (ID), buscar la nota en el estado
    if (typeof noteData === "string") {
      const noteId = noteData;
      const note = sharedNotes.find((n) => n.id === noteId);
      if (!note) return;

      exportByFormat(format, note);
    }
    // Si recibimos un objeto nota completo, usarlo directamente
    else {
      exportByFormat(format, noteData);
    }
  };

  // Actualizar esta función también
  const exportByFormat = (format: string, note: SharedNote) => {
    // Asegurar que content sea un string
    const content = note.content || "";
    const title = note.title || "Nota compartida sin título";

    switch (format) {
      case "pdf":
        exportAsPDFHelper(title, content, {
          images: note.images,
          imageBaseUrl: process.env.REACT_APP_API_URL?.replace("/api", "") ?? ""
        });
        break;
      case "txt":
        exportAsTXT(title, content);
        break;
      default:
        break;
    }
  };

  const exportAsTXT = (title: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title}.txt`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    document.body.removeChild(element);
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
    handleAddSharedImage,
    handleExportSharedNote,
  };
}
