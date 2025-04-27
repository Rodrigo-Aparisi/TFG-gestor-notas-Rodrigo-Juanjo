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
  }
};

export default chatbotService;
