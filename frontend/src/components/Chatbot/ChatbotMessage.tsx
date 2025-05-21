import React from 'react';
import '../../styles/chatbot.css';
import ReactMarkdown from 'react-markdown';

interface ChatbotMessageProps {
  message: {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    action?: string;
    data?: any;
  };
}

const ChatbotMessage: React.FC<ChatbotMessageProps> = ({ message }) => {
  // Función para renderizar acciones específicas
  const renderActionContent = () => {
    if (!message.action || message.sender !== 'bot') return null;
    
    switch (message.action) {
      case 'transcribeImage':
        return (
          <div className="transcription-container">
            <div className="transcription-content">
              {message.data?.transcription}
            </div>
          </div>
        );
        
      case 'createNote':
      case 'updateNote':
      case 'addImageToNote':
        if (message.data?.noteData) {
          return (
            <div className="note-action-container">
              <div className="note-action-info">
                <i className="fas fa-sticky-note"></i>
                <span>{message.data.noteData.title}</span>
              </div>
            </div>
          );
        }
        return null;
        
      case 'deleteNote':
        return (
          <div className="note-action-container delete">
            <div className="note-action-info">
              <i className="fas fa-trash-alt"></i>
              <span>Nota eliminada</span>
            </div>
          </div>
        );
        
      case 'createReminder':
        if (message.data?.reminderData) {
          return (
            <div className="reminder-action-container">
              <div className="reminder-action-info">
                <i className="fas fa-bell"></i>
                <span>{message.data.reminderData.title}</span>
                <small>{new Date(message.data.reminderData.date_time).toLocaleString()}</small>
              </div>
            </div>
          );
        }
        return null;
        
      default:
        return null;
    }
  };
  
  return (
    <div className={`chatbot-message \${message.sender}`}>
      <div className="message-content">
        <ReactMarkdown>{message.text}</ReactMarkdown>
        {renderActionContent()}
      </div>
      <div className="message-timestamp">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ChatbotMessage;
