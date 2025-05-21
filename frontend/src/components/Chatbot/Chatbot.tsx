import React, { useState, useEffect, useRef } from 'react';
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

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: '¡Hola! Soy tu asistente para la app de notas. Puedo ayudarte a crear, editar o eliminar notas, añadir imágenes, crear recordatorios o transcribir imágenes. ¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
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
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Procesar mensaje con el servicio
      const response = await chatbotService.processMessage(text, history, imageUrl || undefined);
      
      // Resetear imagen si había alguna
      setImageUrl(null);
      
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
            
          case 'updateNote':
            botMessage.text = response.response || 'He actualizado la nota.';
            break;
            
          case 'deleteNote':
            botMessage.text = response.response || 'He eliminado la nota.';
            break;
            
          case 'addImageToNote':
            botMessage.text = response.response || 'He añadido la imagen a la nota.';
            break;
            
          case 'createReminder':
            botMessage.text = response.response || 'He creado un recordatorio nuevo.';
            break;
            
          case 'transcribeImage':
            botMessage.text = `Transcripción de la imagen:\n\n\${response.transcription || 'No se pudo transcribir el texto'}`;
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
  
  const handleUploadImage = async (file: File) => {
    try {
      // Añadir mensaje indicando que se está procesando la imagen
      setMessages(prev => [...prev, {
        text: `Subiendo imagen: \${file.name}`,
        sender: 'user',
        timestamp: new Date()
      }]);
      
      setIsLoading(true);
      
      // Subir imagen
      const imageUrl = await chatbotService.uploadImage(file);
      setImageUrl(imageUrl);
      
      setMessages(prev => [...prev, {
        text: '¿Qué te gustaría hacer con esta imagen? Puedo transcribir su contenido, crear una nota con ella o añadirla a una nota existente.',
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
