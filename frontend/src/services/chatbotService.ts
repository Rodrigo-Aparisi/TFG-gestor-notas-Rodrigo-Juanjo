import api from './api';

const chatbotService = {
  async processMessage(message: string, history: any[] = [], image?: string) {
    try {
      console.log('Enviando mensaje al chatbot:', { message, historyLength: history?.length, hasImage: !!image });
      
      const data = {
        message,
        history,
        image
      };
      
      const response = await api.post('/chatbot/process', data);
      console.log('Respuesta del servidor:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en chatbot service:', error);
      throw new Error('Error al procesar el mensaje');
    }
  },
  
  async uploadImage(file: File) {
    try {
      console.log('Subiendo imagen:', file.name);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/chatbot/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Imagen subida:', response.data);
      
      // Devolver la ruta local para OCR
      return response.data.localPath || response.data.imageUrl;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw new Error('Error al subir la imagen');
    }
  },
  
  async getNoteById(noteId: string) {
    try {
      const response = await api.get(`/notes/\${noteId}`);
      return response.data.note;
    } catch (error) {
      console.error('Error al obtener nota por ID:', error);
      throw new Error('Error al obtener la nota');
    }
  },
  
  async getAllNotes() {
    try {
      const response = await api.get('/notes');
      return response.data.notes;
    } catch (error) {
      console.error('Error al obtener todas las notas:', error);
      throw new Error('Error al obtener las notas');
    }
  },
  
  async updateNote(noteId: string, data: any) {
    try {
      const response = await api.put(`/notes/\${noteId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar la nota:', error);
      throw new Error('Error al actualizar la nota');
    }
  },
  
  async deleteNote(noteId: string) {
    try {
      const response = await api.delete(`/notes/\${noteId}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar la nota:', error);
      throw new Error('Error al eliminar la nota');
    }
  },
  
  async uploadNoteImage(file: File) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/notes/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.data.imageUrl;
    } catch (error) {
      console.error('Error al subir imagen de nota:', error);
      throw new Error('Error al subir la imagen');
    }
  }
};

export default chatbotService;
