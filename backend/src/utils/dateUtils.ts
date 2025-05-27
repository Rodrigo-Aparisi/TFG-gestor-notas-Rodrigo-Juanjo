// dateUtils.ts
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
    } else if (dateText.match(/\d{1,2}(?:\s+del\s+mes)?$/i)) {
      // Formato "día X" o "X del mes"
      const match = dateText.match(/(\d{1,2})(?:\s+del\s+mes)?$/i);
      if (match) {
        const day = parseInt(match[1], 10);
        if (day >= 1 && day <= 31) {
          const currentDay = now.getDate();
          const currentMonth = now.getMonth();
          
          // Establecer el día en la fecha actual
          targetDate.setDate(day);
          
          // Si el día ya pasó en este mes, avanzar al próximo mes
          if (day < currentDay) {
            targetDate.setMonth(currentMonth + 1);
          }
          
          console.log(`Estableciendo día específico: ${day} (${targetDate.toISOString()})`);
        }
      }
    }
    
        // Procesar el texto de hora si existe
        if (timeText) {
            const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                hour = parseInt(timeMatch[1], 10);
                minutes = parseInt(timeMatch[2], 10);
                
                // NO CONVERTIR LA HORA - usar exactamente la hora especificada
                console.log(`Estableciendo hora específica: ${hour}:${minutes}`);
            }
        }
        
        // Establecer la hora en la fecha objetivo
        targetDate.setHours(hour, minutes, 0, 0);

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const hourStr = String(hour).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hourStr}:${minutesStr}:00`;
    },
  
  extractTitleFromMessage(message: string): string | undefined {
    message = message.toLowerCase();
    
    // Patrón 1: "llamado/llamada [título]"
    const llamadoPattern = /llamad[oa]\s+(?:"|')?([^"',.]+)(?:"|')?/i;
    const llamadoMatch = message.match(llamadoPattern);
    if (llamadoMatch && llamadoMatch[1]) {
      return llamadoMatch[1].trim();
    }
    
    // Patrón 2: "se llame [título]"
    const seLlamePattern = /se\s+llame\s+(?:"|')?([^"',.]+)(?:"|')?/i;
    const seLlameMatch = message.match(seLlamePattern);
    if (seLlameMatch && seLlameMatch[1]) {
      return seLlameMatch[1].trim();
    }
    
    // Patrón 3: "título [título]"
    const tituloPattern = /título\s+(?:"|')?([^"',.]+)(?:"|')?/i;
    const tituloMatch = message.match(tituloPattern);
    if (tituloMatch && tituloMatch[1]) {
      return tituloMatch[1].trim();
    }
    
    // Reuniones específicas
    if (message.includes('reunión') || message.includes('reunion')) {
      if (message.includes('comsa')) {
        return "Reunión Comsa";
      }
      
      const reunionPattern = /reuni[óo]n\s+(?:con|de|sobre)\s+([^,.]+)/i;
      const reunionMatch = message.match(reunionPattern);
      if (reunionMatch && reunionMatch[1]) {
        return `Reunión con ${reunionMatch[1].trim()}`;
      }
    }
    
    // Citas específicas
    if (message.includes('cita')) {
      const citaMatch = message.match(/cita\s+(?:con|para)\s+([^,.]+)/i);
      if (citaMatch && citaMatch[1]) {
        return `Cita con ${citaMatch[1].trim()}`;
      }
    }
    
    // Si no se encontró un título específico
    return undefined;
  },
  
  /**
   * Extrae información de fecha y hora de un mensaje de usuario
   * @param message Mensaje del usuario
   */
  extractDateTimeFromMessage(message: string): { 
    dateTime: string, 
    hasTime: boolean,
    sendEmail: boolean,
    isReunion?: boolean,
    isCita?: boolean,
    title?: string,
    originalText: { date: string, time: string } 
  } {
    message = message.toLowerCase();
    let dateText = '';
    let timeText = '';
    let hasTime = false;
    let sendEmail = false;

    // Detectar si el usuario quiere recibir notificación por email
    if (message.includes('email') || 
        message.includes('correo') || 
        message.includes('mandes') || 
        message.includes('notifica')) {
        sendEmail = true;
    }

    // Extraer título más específicamente para "llamado" o "llamada"
    let extractedTitle: string | undefined = undefined;
    
    // Buscar patrones específicos para títulos con "llamado" o "llamada"
    const llamadoPattern = /llamado\s+([^,.]+)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
    const llamadaPattern = /llamada\s+([^,.]+)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
    
    const llamadoMatch = message.match(llamadoPattern);
    const llamadaMatch = message.match(llamadaPattern);
    
    if (llamadoMatch && llamadoMatch[1]) {
        extractedTitle = llamadoMatch[1].trim();
    } else if (llamadaMatch && llamadaMatch[1]) {
        extractedTitle = llamadaMatch[1].trim();
    } else {
        // Si no encuentra "llamado"/"llamada", usar el método existente
        extractedTitle = this.extractTitleFromMessage(message);
    }
    
    // Si el título es muy largo, probablemente es incorrecto
    if (extractedTitle && extractedTitle.length > 30) {
        // Intentar limpiar el título
        const cleanMatch = extractedTitle.match(/^(.*?)(?:\s+(?:el|para|a las|mañana))/i);
        if (cleanMatch && cleanMatch[1]) {
            extractedTitle = cleanMatch[1].trim();
        }
    }

    // MEJORA: Buscar días de la semana específicos
    const diasSemana = [
        { nombre: 'lunes', index: 1 },
        { nombre: 'martes', index: 2 },
        { nombre: 'miércoles', index: 3 },
        { nombre: 'miercoles', index: 3 },
        { nombre: 'jueves', index: 4 },
        { nombre: 'viernes', index: 5 },
        { nombre: 'sábado', index: 6 },
        { nombre: 'sabado', index: 6 },
        { nombre: 'domingo', index: 0 }
    ];
    
    // Buscar menciones de días de la semana
    for (const {nombre, index} of diasSemana) {
      if (message.includes(nombre)) {
        const today = new Date().getDay(); // 0-6, donde 0 es domingo
        let daysToAdd = index - today;
        if (daysToAdd <= 0) daysToAdd += 7; // Si ya pasó este día, ir al próximo
        
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        
        // Formato "miércoles"
        dateText = `próximo ${nombre}`;
        console.log(`Día de semana detectado: ${nombre}, calculando para el próximo ${nombre}`);
        break;
      }
    }

    // Resto del código existente para fechas específicas
    if (!dateText) {
      // Buscar formato específico "día X de [mes]"
      const specificDateMatch = message.match(/(?:día|el día|el)\s+(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
      if (specificDateMatch) {
        const day = specificDateMatch[1];
        const month = specificDateMatch[2];
        dateText = `${day} de ${month}`;
      }
      
      // Buscar formato "el día X" sin mes
      const specificDayMatch = message.match(/(?:día|el día|el|para el día|para el)\s+(\d{1,2})(?!\s+de)/i);
      if (specificDayMatch && !specificDateMatch) {
        const day = parseInt(specificDayMatch[1], 10);
        
        // Verificar que el día es un número válido para un mes
        if (day >= 1 && day <= 31) {
          dateText = `${day} del mes`;
          console.log(`Día específico detectado sin mes: ${day}`);
        }
      }
      
      // Buscar referencias a fechas relativas
      if (message.includes('mañana')) {
        dateText = 'mañana';
      } 
      else if (message.includes('pasado mañana') || message.includes('pasado')) {
        dateText = 'pasado mañana';
      }
      else if (message.includes('hoy')) {
        dateText = 'hoy';
      }
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

    let isReunion = false;
    let isCita = false;
    if (message.toLowerCase().includes('reunión') || 
        message.toLowerCase().includes('reunion')) {
      isReunion = true;
    }
    if (message.toLowerCase().includes('cita')) {
      isCita = true;
    }

    const timeAtMatch = message.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?/i);
    if (timeAtMatch) {
        let hour = parseInt(timeAtMatch[1]);
        let minutes = timeAtMatch[2] ? parseInt(timeAtMatch[2]) : 0;
        
        // No ajustar automáticamente la hora - usar la hora exacta especificada
        // Esto es importante para mantener 12:00 como 12:00 y no convertirlo a 10:00
        
        timeText = `${hour}:${minutes.toString().padStart(2, '0')}`;
        hasTime = true;
        console.log(`Hora extraída de "a las": ${hour}:${minutes}`);
    }
    
    
    // Buscar referencias específicas a horas
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

    console.log(`Fecha extraída: ${dateText}, Hora: ${timeText}, ISO: ${dateTimeISO}, Email: ${sendEmail}, Título: ${extractedTitle || "No detectado"}`);
    
    return {
      dateTime: dateTimeISO,
      hasTime: hasTime,
      sendEmail: sendEmail,
      isReunion: message.includes('reunión') || message.includes('reunion'),
      isCita: message.includes('cita'),
      title: extractedTitle,
      originalText: {
        date: dateText,
        time: timeText
      }
    };
  }
};
