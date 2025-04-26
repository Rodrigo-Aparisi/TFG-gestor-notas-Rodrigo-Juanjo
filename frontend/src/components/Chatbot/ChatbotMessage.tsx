import React from 'react';
import '../../styles/chatbot.css';

interface ChatbotMessageProps {
  message: {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
  };
}

const ChatbotMessage: React.FC<ChatbotMessageProps> = ({ message }) => {
  return (
    <div className={`chatbot-message ${message.sender}`}>
      <div className="message-content">
        {message.text}
      </div>
      <div className="message-timestamp">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ChatbotMessage;
