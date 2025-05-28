// chatbotService.ts
import api from './api';

const chatbotService = {
  async processMessage(message: string, history: any[] = [], image?: string) {
    try {
      console.log('Enviando mensaje al chatbot:', { message, historyLength: history?.length, hasImage: !!image });
      
      // Analizar el mensaje para detectar posibles intenciones
      const messageIntent = this.analyzeMessageIntent(message);
      
      const data = {
        message,
        history,
        image,
        messageIntent // Enviar el análisis previo de intenciones
      };
      
      const response = await api.post('/chatbot/process', data);
      console.log('Respuesta del servidor:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en chatbot service:', error);
      throw new Error('Error al procesar el mensaje');
    }
  },
  
  // Analiza la intención del mensaje antes de enviarlo
  analyzeMessageIntent(message: string) {
    const lowerMessage = message.toLowerCase();
    const intent: {
      isReminder: boolean;
      isSearch?: boolean;
      isInfoRequest?: boolean;
      hasDate: boolean;
      hasTime: boolean;
      wantsEmail: boolean;
      reminderType: string;
      details: Record<string, any>
    } = {
      isReminder: false,
      hasDate: false,
      hasTime: false,
      wantsEmail: false,
      reminderType: '',
      details: {} as Record<string, any>
    };
    
    // Detectar si es un recordatorio
    if (lowerMessage.includes('recordatorio') || 
        lowerMessage.includes('recordar') || 
        lowerMessage.includes('reunión') || 
        lowerMessage.includes('reunion') || 
        lowerMessage.includes('cita') ||
        lowerMessage.includes('avísame')) {
      intent.isReminder = true;

      // Detectar tipo específico y detalles
      if (lowerMessage.includes('reunión') || lowerMessage.includes('reunion')) {
        intent.reminderType = 'reunion';
        
        // Extraer posibles detalles de la reunión
        const reunionMatch = lowerMessage.match(/reunión\s+(?:de|con|sobre)\s+([a-zA-Z0-9\s]+)/i);
        if (reunionMatch && reunionMatch[1]) {
          const entidad = reunionMatch[1].trim();
          intent.details['entidad'] = entidad;
          
          // Verificar si es una empresa o una persona
          if (entidad.match(/empresa|compañía|trabajo|oficina/i)) {
            intent.details['tipoEntidad'] = 'empresa';
          } else {
            intent.details['tipoEntidad'] = 'persona';
          }
        }
      } else if (lowerMessage.includes('cita')) {
        intent.reminderType = 'cita';
        
        // Extraer detalles de la cita
        const citaMatch = lowerMessage.match(/cita\s+(?:con|para)\s+([a-zA-Z0-9\s]+)/i);
        if (citaMatch && citaMatch[1]) {
          intent.details['persona'] = citaMatch[1].trim();
        }
      }

      // Detectar título específico
      // Buscar patrones específicos para títulos con "llamado" o "llamada"
      const llamadoPattern = /llamado\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
      const llamadaPattern = /llamada\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
      
      const llamadoMatch = message.match(llamadoPattern);
      const llamadaMatch = message.match(llamadaPattern);
      
      if (llamadoMatch && llamadoMatch[1]) {
        intent.details['title'] = llamadoMatch[1].trim();
      } else if (llamadaMatch && llamadaMatch[1]) {
        intent.details['title'] = llamadaMatch[1].trim();
      } else if (lowerMessage.includes('reunión') || lowerMessage.includes('reunion')) {
        // Código para reuniones
        const reunionMatch = lowerMessage.match(/reunión\s+(?:de|con|sobre)\s+([a-zA-Z0-9\s]+)/i);
        if (reunionMatch && reunionMatch[1]) {
          const entidad = reunionMatch[1].trim();
          intent.details['entidad'] = entidad;
          intent.details['title'] = `Reunión con ${entidad}`;
        }
      } else if (lowerMessage.includes('cita')) {
        // Código para citas
        const citaMatch = lowerMessage.match(/cita\s+(?:con|para)\s+([a-zA-Z0-9\s]+)/i);
        if (citaMatch && citaMatch[1]) {
          const persona = citaMatch[1].trim();
          intent.details['persona'] = persona;
          intent.details['title'] = `Cita con ${persona}`;
        }
      }
      
      // Buscar patrones adicionales para títulos
      const paraPattern = /para\s+([^,.]+?)(?:\s+(?:a las|el|mañana|el día)|\s*$)/i;
      const paraMatch = lowerMessage.match(paraPattern);
      if (!intent.details['title'] && paraMatch && paraMatch[1] && paraMatch[1].length > 3) {
        intent.details['title'] = paraMatch[1].trim();
      }
      
      // Detectar "mañana"
      if (lowerMessage.includes('mañana')) {
        intent.hasDate = true;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        intent.details['date'] = tomorrow.toISOString().split('T')[0];
      }
      
      // Detectar "a las X" para horas - MEJORADO
      const timeAtMatch = lowerMessage.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?/i);
      if (timeAtMatch) {
        intent.hasTime = true;
        intent.details['hour'] = parseInt(timeAtMatch[1]);
        intent.details['minutes'] = timeAtMatch[2] ? parseInt(timeAtMatch[2]) : 0;
        
        // No ajustar la zona horaria - usar la hora exacta
        intent.details['exactTime'] = true;
      }
      
      // Detectar solicitud de email
      intent.wantsEmail = /email|correo|mand[ae][mr]?e?|notific[ao]|avis[ao]/i.test(lowerMessage);
    }
    
    // Detectar búsqueda
    const isSearch = lowerMessage.includes('busca') || 
                     lowerMessage.includes('encuentra') || 
                     lowerMessage.includes('buscar') || 
                     lowerMessage.includes('encontrar');
    
    if (isSearch) {
      intent.isSearch = true;
      
      // Extraer término de búsqueda
      const searchTerm = lowerMessage.replace(/busca|encuentra|buscar|encontrar|por favor|me puedes|podrías|entre mis notas|en mis notas|entre mis recordatorios|en mis recordatorios/gi, '').trim();
      
      intent.details['searchTerm'] = searchTerm;
    }
    
    // Detectar solicitud de información
    const isInfoRequest = lowerMessage.includes('información') || 
                          lowerMessage.includes('datos') || 
                          lowerMessage.includes('estadísticas') ||
                          lowerMessage.includes('cuántas notas') ||
                          lowerMessage.includes('cuántos recordatorios');
    
    if (isInfoRequest) {
      intent.isInfoRequest = true;
      
      if (lowerMessage.includes('nota')) {
        intent.details['infoType'] = 'notes';
      } else if (lowerMessage.includes('recordatorio')) {
        intent.details['infoType'] = 'reminders';
      } else {
        intent.details['infoType'] = 'general';
      }
    }
    
    return intent;
  },
  
  // Métodos simplificados para buscar notas y recordatorios
  async searchNotes(searchTerm: string) {
    try {
      const response = await api.get(`/notes/search?term=${encodeURIComponent(searchTerm)}`);
      return response.data.notes;
    } catch (error) {
      console.error('Error al buscar notas:', error);
      throw new Error('Error al buscar notas');
    }
  },
  
  async searchReminders(searchTerm: string) {
    try {
      const response = await api.get(`/reminders/search?term=${encodeURIComponent(searchTerm)}`);
      return response.data.reminders;
    } catch (error) {
      console.error('Error al buscar recordatorios:', error);
      throw new Error('Error al buscar recordatorios');
    }
  },
  
  // Método para obtener información general
  async getInfo(infoType: string = 'general') {
    try {
      const response = await api.get(`/info/${infoType}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener información:', error);
      throw new Error('Error al obtener información');
    }
  }
};

export default chatbotService;
