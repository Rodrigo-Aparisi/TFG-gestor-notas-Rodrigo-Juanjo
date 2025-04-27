import React, { useState, useEffect, useRef } from 'react';
import ChatbotMessage from './ChatbotMessage';
import ChatbotInput from './ChatbotInput';
import chatbotService from '../../services/chatbotService';
import '../../styles/chatbot.css';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: '¡Hola! Soy tu asistente para la app de notas. Puedo ayudarte a crear notas, recordatorios o transcribir imágenes. ¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (text: string) => {
    // Añadir mensaje del usuario
    const newUserMessage = {
      text,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    try {
      // Formatear historial para la API
      const history = messages.slice(-10).map(msg => ({
        text: msg.text,
        sender: msg.sender
      }));
      
      // Procesar mensaje con el servicio
      const response = await chatbotService.processMessage(text, history, imageUrl || undefined);
      
      // Resetear imagen si había alguna
      setImageUrl(null);
      
      // Crear mensaje base
      const botMessage: Message = {
        text: '',
        sender: 'bot',
        timestamp: new Date()
      };
      
      // Manejar diferentes tipos de respuestas
      if (response && typeof response === 'object') {
        if (response.action === 'createNote') {
          botMessage.text = response.response || 'He creado una nota nueva.';
        } else if (response.action === 'createReminder') {
          botMessage.text = response.response || 'He creado un recordatorio nuevo.';
        } else if (response.action === 'transcribeImage') {
          botMessage.text = `Transcripción de la imagen:\n\n${response.transcription || 'No se pudo transcribir el texto'}`;
        } else {
          // Respuesta normal
          botMessage.text = response.response || 'No entendí lo que querías decir.';
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
  
  
  const handleUploadImage = async (file: File) => {
    try {
      // Añadir mensaje indicando que se está procesando la imagen
      setMessages(prev => [...prev, {
        text: `Subiendo imagen: ${file.name}`,
        sender: 'user',
        timestamp: new Date()
      }]);
      
      setIsLoading(true);
      
      // Subir imagen
      const imageUrl = await chatbotService.uploadImage(file);
      setImageUrl(imageUrl);
      
      setMessages(prev => [...prev, {
        text: '¿Qué te gustaría hacer con esta imagen? Puedo transcribir su contenido o crear una nota con ella.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error al subir imagen:', error);
      setMessages(prev => [...prev, {
        text: 'Lo siento, ha ocurrido un error al subir la imagen. Por favor, inténtalo de nuevo.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <ChatbotMessage key={index} message={message} />
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
        onUploadImage={handleUploadImage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Chatbot;
