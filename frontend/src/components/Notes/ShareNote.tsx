import React, { useState } from 'react';
import { noteService } from '../../services/api';

interface ShareNoteProps {
  noteId: string;
}

const ShareNote: React.FC<ShareNoteProps> = ({ noteId }) => {
  const [username, setUsername] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [includeImages, setIncludeImages] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  
  const handleShare = async () => {
    if (!username) {
      setFeedback({ message: 'Por favor ingrese un nombre de usuario', type: 'error' });
      return;
    }
    
    try {
      setIsSharing(true);
      const response = await noteService.shareNote(noteId, username, {
        includeImages,
        canEdit
      });
      setFeedback({ message: 'Nota compartida exitosamente', type: 'success' });
      setUsername('');
    } catch (error) {
      console.error('Error al compartir la nota:', error);
      setFeedback({ message: 'Error al compartir la nota', type: 'error' });
    } finally {
      setIsSharing(false);
    }
  };
  
  return (
    <div className="share-note-container">
      {feedback.message && (
        <div className={`share-feedback \${feedback.type}`}>
          <i className={feedback.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
          {feedback.message}
        </div>
      )}
      
      <div className="share-input-group">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
        />
      </div>
      
      <div className="share-options">
        <label className="share-option-label">
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
          />
          <span>Incluir imágenes</span>
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
          {isSharing ? 'Compartiendo...' : 'Compartir'}
        </button>
      </div>
    </div>
  );
};

export default ShareNote;
