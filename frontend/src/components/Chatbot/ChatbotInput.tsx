// ChatbotInput.tsx
import React, { useState } from 'react';
import '../../styles/chatbot.css';

interface ChatbotInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatbotInput: React.FC<ChatbotInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
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
