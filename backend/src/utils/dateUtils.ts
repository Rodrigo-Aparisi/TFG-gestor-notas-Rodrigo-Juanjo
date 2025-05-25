// backend/src/utils/dateUtils.ts

export const dateUtils = {
  /**
   * Obtiene la fecha actual en formato ISO
   */
  getCurrentDateISO(): string {
    return new Date().toISOString().split('.')[0];
  },

  /**
   * Calcula una fecha relativa basada en el texto y devuelve en formato ISO
   * @param dateText Texto que describe la fecha (mañana, próximo lunes, etc.)
   * @param timeText Texto que describe la hora (opcional)
   */
    getRelativeDateISO(dateText: string, timeText?: string): string {
        const now = new Date();
        let targetDate = new Date(now);
        let hour = 12; // Hora predeterminada
        let minutes = 0;
        
        // Procesar el texto de fecha
        dateText = dateText.toLowerCase().trim();
        
        if (dateText.includes('hoy')) {
            // La fecha es hoy, no cambiamos el día
        } 
        else if (dateText.includes('mañana')) {
            targetDate.setDate(targetDate.getDate() + 1);
        } 
        else if (dateText.includes('pasado mañana') || dateText.includes('pasado')) {
            targetDate.setDate(targetDate.getDate() + 2);
        } 
        else if (dateText.match(/próximo|siguiente|este/)) {
            // Buscar día de la semana
            const dayNames = [
            { day: 'lunes', index: 1 },
            { day: 'martes', index: 2 },
            { day: 'miércoles', index: 3 },
            { day: 'miercoles', index: 3 },
            { day: 'jueves', index: 4 },
            { day: 'viernes', index: 5 },
            { day: 'sábado', index: 6 },
            { day: 'sabado', index: 6 },
            { day: 'domingo', index: 0 }
            ];
            
            for (const { day, index } of dayNames) {
            if (dateText.includes(day)) {
                const currentDay = now.getDay();
                let daysToAdd = index - currentDay;
                if (daysToAdd <= 0) daysToAdd += 7; // Si ya pasó este día de la semana, ir al próximo
                targetDate.setDate(targetDate.getDate() + daysToAdd);
                break;
            }
            }
        }
        else if (dateText.match(/\d{1,2}\s+de\s+[a-záéíóúñ]+/i)) {
            // Formato "15 de mayo"
            const match = dateText.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
            if (match) {
            const day = parseInt(match[1]);
            const monthName = match[2].toLowerCase();
            
            const months = [
                { name: 'enero', index: 0 },
                { name: 'febrero', index: 1 },
                { name: 'marzo', index: 2 },
                { name: 'abril', index: 3 },
                { name: 'mayo', index: 4 },
                { name: 'junio', index: 5 },
                { name: 'julio', index: 6 },
                { name: 'agosto', index: 7 },
                { name: 'septiembre', index: 8 },
                { name: 'octubre', index: 9 },
                { name: 'noviembre', index: 10 },
                { name: 'diciembre', index: 11 }
            ];
            
            for (const { name, index } of months) {
                if (monthName.includes(name)) {
                targetDate.setMonth(index);
                targetDate.setDate(day);
                
                // Si la fecha ya pasó este año, asumimos que es para el próximo año
                if (targetDate < now) {
                    targetDate.setFullYear(now.getFullYear() + 1);
                }
                break;
                }
            }
            }
        }
        
        // Procesar el texto de hora si existe
        if (timeText) {
            const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            
            console.log(`Estableciendo hora específica: ${hour}:${minutes}`);
            }
        }
        
        // Establecer la hora en la fecha objetivo
        targetDate.setHours(hour, minutes, 0, 0);
        
        // Devolver en formato ISO sin milisegundos
        return targetDate.toISOString().split('.')[0];
    },
  
  /**
   * Extrae información de fecha y hora de un mensaje de usuario
   * @param message Mensaje del usuario
   */
  extractDateTimeFromMessage(message: string): { 
    dateTime: string, 
    hasTime: boolean,
    originalText: { date: string, time: string } 
    } {
    message = message.toLowerCase();
    let dateText = '';
    let timeText = '';
    let hasTime = false;
    
    // Buscar referencias a fechas
    if (message.includes('mañana')) {
        dateText = 'mañana';
    } 
    else if (message.includes('pasado mañana') || message.includes('pasado')) {
        dateText = 'pasado mañana';
    }
    else if (message.includes('hoy')) {
        dateText = 'hoy';
    }
    else {
        // Buscar "próximo/siguiente [día de la semana]"
        const dayMatch = message.match(/(próximo|siguiente|este)\s+([a-záéíóúñ]+)/i);
        if (dayMatch) {
        dateText = dayMatch[0];
        }
        
        // Buscar formato "15 de mayo"
        const dateFormatMatch = message.match(/\d{1,2}\s+de\s+[a-záéíóúñ]+/i);
        if (dateFormatMatch) {
        dateText = dateFormatMatch[0];
        }
    }
    
    // Buscar referencias específicas a horas - MEJORADO
    const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm|de la mañana|de la tarde|del mediodía|de la noche))?/i;
    const timeMatch = message.match(timeRegex);
    
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        let period = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
        
        // Ajustar AM/PM
        if (period.includes('pm') || period.includes('tarde') || period.includes('noche')) {
        if (hour < 12) hour += 12;
        } 
        else if (period.includes('am') || period.includes('mañana')) {
        if (hour === 12) hour = 0;
        }
        // Si no hay AM/PM pero es 12, asumimos mediodía
        else if (hour === 12 || period.includes('mediodía')) {
        hour = 12;
        }
        // Si la hora es menor que 6 sin AM/PM, probablemente es PM
        else if (hour >= 1 && hour <= 5 && !period) {
        hour += 12;
        }
        
        timeText = `${hour}:${minutes.toString().padStart(2, '0')}`;
        hasTime = true;
        
        console.log(`Hora extraída: ${hour}:${minutes} (${period})`);
    }
    
    // Si no se encontró fecha, usar "hoy"
    if (!dateText) {
        dateText = 'hoy';
    }
    
    // Calcular la fecha ISO basada en los textos extraídos
    const dateTimeISO = this.getRelativeDateISO(dateText, timeText);
    
    console.log(`Fecha extraída: ${dateText}, Hora: ${timeText}, ISO: ${dateTimeISO}`);
    
    return {
        dateTime: dateTimeISO,
        hasTime: hasTime,
        originalText: {
        date: dateText,
        time: timeText
        }
    };
  }
};
