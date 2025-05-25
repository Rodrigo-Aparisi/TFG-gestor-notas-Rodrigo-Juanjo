// frontend/src/components/Chatbot/ChatbotFloatingButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import Chatbot from './Chatbot';
import { FaTimes, FaTrashAlt } from 'react-icons/fa';
import { GiCaduceus } from "react-icons/gi";
import '../../styles/chatbot-floating.css';

const ChatbotFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatKey, setChatKey] = useState(Date.now()); // Clave para forzar la recarga del componente
  const chatbotRef = useRef<HTMLDivElement>(null);
  
  // Efecto para mantener el estado del chat abierto/cerrado en sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem('chatbotIsOpen');
    if (savedState) {
      setIsOpen(savedState === 'true');
    }
  }, []);
  
  // Guardar el estado de abierto/cerrado en sessionStorage
  useEffect(() => {
    sessionStorage.setItem('chatbotIsOpen', isOpen.toString());
  }, [isOpen]);
  
  // Función para limpiar el historial
  const clearHistory = () => {
    // Usar la función expuesta por el componente Chatbot si está disponible
    if (typeof window.clearChatHistory === 'function') {
      window.clearChatHistory();
    } else {
      // Fallback: crear mensaje de bienvenida y guardar en sessionStorage
      const welcomeMessage = {
        text: `¡Hola! Soy Olymp.IA, tu asistente para la app de notas. Puedo ayudarte con:

      📝 NOTAS:
      • Crear y editar notas
      • Destacar notas importantes
      • Añadir imágenes


      \u00A0
      ⏰ RECORDATORIOS:
      • Crear recordatorios con fecha y hora
      • Configurar notificaciones
      • Cambiar estados


      \u00A0
      🔍 OTRAS FUNCIONES:
      • Transcribir texto de imágenes
      • Buscar en tus notas y recordatorios

      ¿En qué puedo ayudarte hoy?`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem('chatMessages', JSON.stringify([welcomeMessage]));
      
      // Forzar la recarga del componente Chatbot cambiando su key
      setChatKey(Date.now());
    }
  };
  
  // Efecto para manejar el clic fuera del chat para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        chatbotRef.current && 
        !chatbotRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.chatbot-floating-button')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <>
      {isOpen && (
        <div 
          className="chatbot-floating-container"
          ref={chatbotRef}
        >
          <div className="chatbot-header-buttons">
            <button 
              onClick={() => setIsOpen(false)} 
              className="close-button"
              title="Cerrar chat"
            >
              <FaTimes />
            </button>
          </div>
          <div className="chatbot-floating-content">
            <Chatbot key={chatKey} />
          </div>
        </div>
      )}
      
      <button 
        className="chatbot-floating-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir asistente IA"
        title={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      >
        {isOpen ? <FaTimes /> : <GiCaduceus />}
      </button>
    </>
  );
};

// Añadir la definición de la función global para TypeScript
declare global {
  interface Window {
    clearChatHistory?: () => void;
  }
}

export default ChatbotFloatingButton;
