import React, { useState } from 'react';
import { noteService } from '../../services/api';

interface ShareNoteProps {
  noteId: string;
}

const ShareNote: React.FC<ShareNoteProps> = ({ noteId }) => {
  const [username, setUsername] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  
  const handleShare = async () => {
    if (!username) {
      setFeedback({ message: 'Por favor ingrese un nombre de usuario', type: 'error' });
      return;
    }
    
    try {
      setIsSharing(true);
      // Asumiendo que actualizarás el servicio para aceptar username en lugar de email
      const response = await noteService.shareNote(noteId, username);
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
        <div className={`share-feedback ${feedback.type}`}>
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
