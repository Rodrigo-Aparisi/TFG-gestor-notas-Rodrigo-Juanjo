import React, { useState, useEffect } from 'react';
import { calendarService } from '../../services/api';
import WeekView from './WeekView';
import { Reminder } from '../../types';
import { getWeekStart } from './ReminderUtils';
import '../../styles/weekViewPopup.css';

interface WeekViewPopupProps {
  onClose: () => void;
}

const WeekViewPopup: React.FC<WeekViewPopupProps> = ({ onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [focusedReminder, setFocusedReminder] = useState<Reminder | null>(null);
  
  useEffect(() => {
    const loadReminders = async () => {
      try {
        setIsLoading(true);
        
        // Obtener el primer día de la semana actual
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        // Calcular el rango para incluir la semana
        const startDate = new Date(weekStart);
        startDate.setDate(startDate.getDate() - 7); 
        
        const endDate = new Date(weekEnd);
        endDate.setDate(endDate.getDate() + 7);
        
        const response = await calendarService.getReminders({
          startDate,
          endDate
        });
  
        if (response && response.reminders) {
          const transformedReminders = response.reminders.map((reminder: Reminder) => ({
            ...reminder,
            dateTime: new Date(reminder.dateTime)
          }));
          
          setReminders(transformedReminders);
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    loadReminders();
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  // Modificamos esta función para alternar el recordatorio seleccionado
  const handleReminderClick = (reminder: Reminder, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Si ya está seleccionado el mismo recordatorio, lo deseleccionamos
    if (focusedReminder && focusedReminder.id === reminder.id) {
      setFocusedReminder(null);
    } else {
      // Si no, seleccionamos el nuevo recordatorio
      setFocusedReminder(reminder);
    }
  };

  const handleShowMore = (date: Date) => {
    window.location.href = `/Reminders?date=${date.toISOString()}`;
    onClose();
  };

  return (
    <div className="week-view-popup" id="week-view-popup">
      <div className="week-view-popup-header">
        <h3>Vista Semanal</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="week-view-popup-content">
        {isLoading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <WeekView
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            reminders={reminders}
            focusedReminder={focusedReminder}
            onDateSelect={handleDateSelect}
            onReminderClick={handleReminderClick}
            onShowMore={handleShowMore}
          />
        )}
      </div>
      <div className="week-view-popup-footer">
        <button 
          className="view-full-calendar-button"
          onClick={() => {
            window.location.href = '/Reminders';
            onClose();
          }}
        >
          Ver calendario completo
        </button>
      </div>
    </div>
  );
};

export default WeekViewPopup;
