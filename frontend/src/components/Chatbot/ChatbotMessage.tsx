// ChatbotMessage.tsx
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
      case 'createNote':
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
        
      case 'searchResults':
        if (message.data?.results) {
          return (
            <div className="search-results-container">
              <div className="search-results-info">
                <i className="fas fa-search"></i>
                <span>Resultados de búsqueda</span>
              </div>
              <div className="search-results-content">
                {message.data.results.notes && message.data.results.notes.length > 0 && (
                  <div className="search-notes">
                    <h4>Notas ({message.data.results.notes.length})</h4>
                    <ul>
                      {message.data.results.notes.map((note: any) => (
                        <li key={note.id}>
                          <i className="fas fa-sticky-note"></i> {note.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {message.data.results.reminders && message.data.results.reminders.length > 0 && (
                  <div className="search-reminders">
                    <h4>Recordatorios ({message.data.results.reminders.length})</h4>
                    <ul>
                      {message.data.results.reminders.map((reminder: any) => (
                        <li key={reminder.id}>
                          <i className="fas fa-bell"></i> {reminder.title}
                          <small>{new Date(reminder.date_time).toLocaleString()}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!message.data.results.notes || message.data.results.notes.length === 0) && 
                 (!message.data.results.reminders || message.data.results.reminders.length === 0) && (
                  <p>No se encontraron resultados.</p>
                )}
              </div>
            </div>
          );
        }
        return null;
        
      case 'infoProvided':
        if (message.data?.infoData) {
          return (
            <div className="info-container">
              <div className="info-header">
                <i className="fas fa-info-circle"></i>
                <span>Información</span>
              </div>
              <div className="info-content">
                {message.data.infoData.notesCount !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-sticky-note"></i>
                    <span>Notas: {message.data.infoData.notesCount}</span>
                  </div>
                )}
                {message.data.infoData.remindersCount !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-bell"></i>
                    <span>Recordatorios: {message.data.infoData.remindersCount}</span>
                  </div>
                )}
                {message.data.infoData.total !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-list"></i>
                    <span>Total: {message.data.infoData.total}</span>
                  </div>
                )}
                {message.data.infoData.pending !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>Pendientes: {message.data.infoData.pending}</span>
                  </div>
                )}
                {message.data.infoData.completed !== undefined && (
                  <div className="info-item">
                    <i className="fas fa-check-circle"></i>
                    <span>Completados: {message.data.infoData.completed}</span>
                  </div>
                )}
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
    <div className={`chatbot-message ${message.sender}`}>
      {message.sender === 'bot' && (
        <div className="avatar-container">
          <div className="bot-avatar">AI</div>
        </div>
      )}
      <div className="message-bubble">
        <div className="message-content">
          <ReactMarkdown>{message.text}</ReactMarkdown>
          {renderActionContent()}
        </div>
        <div className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatbotMessage;
