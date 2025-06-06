import React, { useState, useEffect, useRef } from 'react';
import { noteService } from '../../services/api';

interface UserSuggestion {
  id: string;
  username: string;
  email?: string;
  profile_image?: string;
}

interface AddMemberModalProps {
  onClose: () => void;
  onAddMember: (username: string) => void;
  groupId?: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  onClose,
  onAddMember,
  groupId
}) => {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Efecto para manejar clics fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    if (value.length >= 3) {
      searchUsers(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Función para buscar usuarios que coincidan con el input
  const searchUsers = async (query: string) => {
    try {
      let response;
      if (groupId) {
        response = await noteService.searchGroupUsers(groupId, query);
      } else {
        response = await noteService.searchUsers(query);
      }
      
      setSuggestions(response.users || []);
      setShowSuggestions((response.users || []).length > 0);
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Seleccionar un usuario de la lista
  const selectUser = (selectedUsername: string) => {
    setUsername(selectedUsername);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddMember(username);
      setUsername('');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Añadir Miembro</h2>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="member-username">Nombre de usuario</label>
            <div className="autocomplete-container" ref={suggestionsRef}>
              <input
                id="member-username"
                type="text"
                value={username}
                onChange={handleInputChange}
                placeholder="Ingresa un nombre de usuario"
                required
                disabled={isSubmitting}
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
                      <div className="suggestion-content">
                        {user.profile_image && (
                          <img 
                            src={user.profile_image} 
                            alt={user.username} 
                            className="suggestion-avatar"
                          />
                        )}
                        <div className="suggestion-info">
                          <div className="suggestion-username">{user.username}</div>
                          {user.email && <div className="suggestion-email">{user.email}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="add-btn"
              disabled={!username.trim() || isSubmitting}
            >
              {isSubmitting ? 'Añadiendo...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;