import React from 'react';
import Chatbot from '../components/Chatbot/Chatbot';
import '../styles/chatbot.css';

const ChatbotPage: React.FC = () => {
  return (
    <div className="chatbot-page">
      <h2>Asistente IA</h2>
      <div className="chatbot-wrapper">
        <Chatbot />
      </div>
    </div>
  );
};

export default ChatbotPage;
