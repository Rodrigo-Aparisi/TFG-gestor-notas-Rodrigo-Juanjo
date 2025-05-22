// frontend/src/components/Chatbot/ChatbotFloatingButton.tsx
import React, { useState } from 'react';
import Chatbot from './Chatbot';
import { FaTimes } from 'react-icons/fa';
import { GiCaduceus } from "react-icons/gi";
import '../../styles/chatbot-floating.css';

const ChatbotFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {isOpen && (
        <div className="chatbot-floating-container">
          <div className="chatbot-floating-header">
            <h3>Asistente IA</h3>
            <button onClick={() => setIsOpen(false)} className="close-button">
              <FaTimes />
            </button>
          </div>
          <div className="chatbot-floating-content">
            <Chatbot />
          </div>
        </div>
      )}
      
      <button 
        className="chatbot-floating-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir asistente IA"
      >
        {isOpen ? <FaTimes /> : <GiCaduceus />}
      </button>
    </>
  );
};

export default ChatbotFloatingButton;
