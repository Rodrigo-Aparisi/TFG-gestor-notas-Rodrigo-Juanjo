import React, { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { noteService } from "../../services/api";
import { useClickOutside } from "../../hooks/useClickOutside";

interface ShareNoteProps {
  noteId: string;
}

interface UserSuggestion {
  id: string;
  username: string;
}

const ShareNote: React.FC<ShareNoteProps> = ({ noteId }) => {
  const [username, setUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Hook para cerrar dropdown al hacer clic fuera
  const closeSuggestions = useCallback(() => setShowSuggestions(false), []);
  useClickOutside(suggestionsRef, closeSuggestions);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    // Si hay al menos 2 caracteres, buscar usuarios
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Función para buscar usuarios que coincidan con el input
  const searchUsers = async (query: string) => {
    if (query.length >= 3) {
      try {
        const response = await noteService.searchUsers(query);
        setSuggestions(response.users || []);
        setShowSuggestions((response.users || []).length > 0);
      } catch (error) {
        console.error("Error al buscar usuarios:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Seleccionar un usuario de la lista
  const selectUser = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setShowSuggestions(false);
  };

  const handleShare = async () => {
    if (!username) {
      toast.error("Por favor ingrese un nombre de usuario");
      return;
    }

    try {
      setIsSharing(true);
      await noteService.shareNote(noteId, username, {
        includeImages,
        canEdit,
      });
      toast.success("Nota compartida exitosamente");
      setUsername("");
    } catch (error) {
      console.error("Error al compartir la nota:", error);
      toast.error("Error al compartir la nota");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="share-note-container">
      <div className="share-input-group">
        <div className="autocomplete-container" ref={suggestionsRef}>
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            placeholder="Nombre de usuario"
            autoComplete="off"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="user-suggestions">
              {suggestions.map((user) => (
                <div
                  key={user.id}
                  className="suggestion-item"
                  onClick={() => selectUser(user.username)}
                >
                  {user.username}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="share-options">
        <label className="share-option-label">
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
          />
          <span>Compartir imágenes</span>
        </label>

        <label className="share-option-label">
          <input
            type="checkbox"
            checked={canEdit}
            onChange={(e) => setCanEdit(e.target.checked)}
          />
          <span>Permitir edición</span>
        </label>

        <button
          className="share-button"
          onClick={handleShare}
          disabled={isSharing}
        >
          {isSharing ? "Compartiendo..." : "Compartir"}
        </button>
      </div>
    </div>
  );
};

export default ShareNote;
