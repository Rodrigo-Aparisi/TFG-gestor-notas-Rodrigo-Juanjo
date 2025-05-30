// Chatbot.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatbotMessage from './ChatbotMessage';
import ChatbotInput from './ChatbotInput';
import chatbotService from '../../services/chatbotService';
import '../../styles/chatbot.css';
import { useNavigate } from 'react-router-dom';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  action?: string;
  data?: any;
}

const WELCOME_MESSAGE = `¡Hola! Soy Olymp.IA, tu asistente para la app de notas. Puedo ayudarte con:

\u00A0

📝 NOTAS:

• Crear notas con título y contenido

\u00A0

⏰ RECORDATORIOS:

• Crear recordatorios con fecha y hora

• Añadir descripciones detalladas

• Configurar notificaciones por email

\u00A0

¿En qué puedo ayudarte hoy?`;

const Chatbot: React.FC = () => {
  // Cargar mensajes de sessionStorage o usar mensaje de bienvenida
  const [messages, setMessages] = useState<Message[]>(() => {
    // Intentar cargar mensajes de sessionStorage
    const savedMessages = sessionStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        // Convertir las fechas de string a objetos Date
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        return parsedMessages;
      } catch (error) {
        console.error('Error al cargar mensajes guardados:', error);
      }
    }
    
    // Mensaje de bienvenida por defecto
    return [{
      text: WELCOME_MESSAGE,
      sender: 'bot',
      timestamp: new Date()
    }];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Guardar mensajes en sessionStorage cuando cambien
  useEffect(() => {
    // Necesitamos convertir las fechas a string antes de guardarlas
    const messagesToSave = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    sessionStorage.setItem('chatMessages', JSON.stringify(messagesToSave));
  }, [messages]);
  
  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Función para limpiar el historial usando useCallback para evitar recreaciones innecesarias
  const clearHistory = useCallback(() => {
    const welcomeMessage = {
      text: WELCOME_MESSAGE,
      sender: 'bot' as const,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    // sessionStorage se actualizará automáticamente gracias al useEffect
  }, []);
  
  // Exponer la función clearHistory para que pueda ser llamada desde el componente padre
  useEffect(() => {
    // @ts-ignore
    window.clearChatHistory = clearHistory;
    
    return () => {
      // @ts-ignore
      delete window.clearChatHistory;
    };
  }, [clearHistory]);
  
  const handleSendMessage = async (text: string) => {
    // No procesar mensajes vacíos
    if (!text.trim()) return;
    
    // Añadir mensaje del usuario
    const newUserMessage = {
      text,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    try {
      // Formatear historial para la API - usar userId si está disponible
      const userId = localStorage.getItem('userId');
      
      const history = messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        userId: userId || undefined
      }));
      
      // Procesar mensaje con el servicio
      const response = await chatbotService.processMessage(text, history);
      
      // Crear mensaje base
      const botMessage: Message = {
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        action: response.action,
        data: response.action !== 'reply' ? response : null
      };
      
      // Manejar diferentes tipos de respuestas
      if (response && typeof response === 'object') {
        switch (response.action) {
          case 'createNote':
            botMessage.text = response.response || 'He creado una nota nueva.';
            break;
            
          case 'createReminder':
            botMessage.text = response.response || 'He creado un recordatorio nuevo.';
            break;
            
          case 'searchResults':
            botMessage.text = response.response || 'Aquí están los resultados de tu búsqueda.';
            break;
            
          case 'infoProvided':
            botMessage.text = response.response || 'Aquí tienes la información que solicitaste.';
            break;
            
          default:
            // Respuesta normal
            botMessage.text = response.response || 'No entendí lo que querías decir.';
            break;
        }
      } else {
        // Fallback si la respuesta no tiene el formato esperado
        botMessage.text = 'Lo siento, no pude procesar tu solicitud correctamente.';
      }
      
      // Añadir el mensaje del bot
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setMessages(prev => [...prev, {
        text: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>Olymp.IA</h3>
        <button 
          className="clear-history" 
          onClick={clearHistory} 
          title="Limpiar conversación"
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
      
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <ChatbotMessage key={`msg-${index}-${message.timestamp.getTime()}`} message={message} />
        ))}
        {isLoading && (
          <div className="chatbot-loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatbotInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
      />
    </div>
  );
};

export default Chatbot;
