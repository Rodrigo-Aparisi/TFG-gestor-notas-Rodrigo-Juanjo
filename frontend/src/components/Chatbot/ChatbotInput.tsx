import React, { useState, useRef } from 'react';
import '../../styles/chatbot.css';

interface ChatbotInputProps {
  onSendMessage: (message: string) => void;
  onUploadImage: (file: File) => void;
  isLoading: boolean;
}

const ChatbotInput: React.FC<ChatbotInputProps> = ({ onSendMessage, onUploadImage, isLoading }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && !isLoading) {
      onUploadImage(e.target.files[0]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
      e.preventDefault();
      onSendMessage(message);
      setMessage('');
    }
  };
  
  return (
    <form className="chatbot-input" onSubmit={handleSubmit}>
      <button 
        type="button" 
        className="image-upload-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        title="Subir imagen"
      >
        <i className="fas fa-image"></i>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*"
        disabled={isLoading}
      />
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? "Procesando..." : "Escribe un mensaje..."}
        className="message-input"
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="send-button" 
        disabled={isLoading || !message.trim()}
        title="Enviar mensaje"
      >
        <i className="fas fa-paper-plane"></i>
      </button>
    </form>
  );
};

export default ChatbotInput;
