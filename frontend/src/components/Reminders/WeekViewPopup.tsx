import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { calendarService } from '../../services/api';
import WeekView from './WeekView';
import { Reminder, NewReminder } from '../../types';
import { getWeekStart, formatDate, formatTime } from './ReminderUtils';
import ReminderForm from './ReminderForm';
import '../../styles/weekViewPopup.css';

interface WeekViewPopupProps {
  onClose: () => void;
}

const WeekViewPopup: React.FC<WeekViewPopupProps> = ({ onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [focusedReminder, setFocusedReminder] = useState<Reminder | null>(null);
  const [reminderDetails, setReminderDetails] = useState<Reminder | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: selectedDate,
    time: '',
    statusId: 1,
    hasTime: false,
    sendEmail: false
  });
  
  // Obtener recordatorios para la semana actual
  const loadReminders = useCallback(async (date: Date) => {
    try {
      setIsLoading(true);
      
      // Obtener el primer día de la semana
      const weekStart = getWeekStart(date);
      setCurrentWeekStart(weekStart);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Ampliar el rango para incluir datos adicionales
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
  }, []);

  useEffect(() => {
    loadReminders(selectedDate);
  }, [selectedDate, loadReminders]);

  useEffect(() => {
    // Actualizar newReminder cuando cambia selectedDate
    setNewReminder(prev => ({
      ...prev,
      date: selectedDate
    }));
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleReminderClick = (reminder: Reminder, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Verificar si es el mismo recordatorio que ya está seleccionado
    if (focusedReminder?.id === reminder.id) {
      // Si es el mismo, desmarcar ambos estados
      setFocusedReminder(null);
      setReminderDetails(null);
    } else {
      // Si es un recordatorio diferente, seleccionarlo
      setFocusedReminder(reminder);
      setReminderDetails(reminder);
    }
  }

  const handleShowMore = (date: Date) => {
    window.location.href = `/reminders?date=${date.toISOString()}`;
    onClose();
  };

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleCreateReminder = async () => {
    try {
      if (!newReminder.title) {
        toast.error('Por favor ingresa un título');
        return;
      }
  
      const dateTime = new Date(newReminder.date);
      
      if (newReminder.hasTime && newReminder.time) {
        const [hours, minutes] = newReminder.time.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes));
      } else {
        // Si no hay hora, establecer a mediodía para evitar problemas de zona horaria
        dateTime.setHours(12, 0, 0, 0);
      }
  
      const reminderData = {
        title: newReminder.title,
        description: newReminder.description,
        dateTime: dateTime,
        statusId: selectedStatus,
        hasTime: newReminder.hasTime,
        sendEmail: newReminder.sendEmail
      };
    
      const response = await calendarService.createReminder(reminderData);
  
      if (response.reminder) {
        // Recargar recordatorios
        await loadReminders(selectedDate);
        
        // Resetear el formulario
        setNewReminder({
          title: '',
          description: '',
          date: selectedDate,
          time: '',
          statusId: 1,
          hasTime: false,
          sendEmail: false
        });
        
        // Ocultar el formulario
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear el recordatorio');
    }
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('es-ES', { month: 'long' });
    const endMonth = weekEnd.toLocaleDateString('es-ES', { month: 'long' });
    
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} de ${startMonth}`;
    } else {
      return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}`;
    }
  };

  const formatReminderDateTime = (dateTime: Date) => {
    const dateStr = formatDate(dateTime);
    
    // Si el recordatorio tiene hora, la mostramos
    if (reminderDetails?.hasTime) {
      const timeStr = formatTime(dateTime);
      return `${dateStr} a las ${timeStr}`;
    }
    
    return dateStr;
  };

  return (
    <div className="week-view-popup-container">
      <div className="week-view-popup" onClick={e => e.stopPropagation()}>
        <div className="week-view-popup-header">
          <button 
            className="week-nav-button prev-week-button" 
            onClick={handlePrevWeek}
            aria-label="Semana anterior"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div className="week-view-popup-title">
            <h3>Vista Semanal</h3>
            <span className="week-range">{formatWeekRange(currentWeekStart)}</span>
          </div>
          
          <button 
            className="week-nav-button next-week-button" 
            onClick={handleNextWeek}
            aria-label="Semana siguiente"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Cerrar"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="week-view-popup-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>Cargando calendario...</span>
            </div>
          ) : (
            <>
              <WeekView
                selectedDate={selectedDate}
                currentMonth={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)}
                reminders={reminders}
                focusedReminder={focusedReminder}
                onDateSelect={handleDateSelect}
                onReminderClick={handleReminderClick}
                onShowMore={handleShowMore}
              />
              
              {reminderDetails && (
                <div className="reminder-quick-view">
                  <div className={`reminder-quick-view-card status-${reminderDetails.statusId}`}>
                    <div className="reminder-quick-view-header">
                      <h4>{reminderDetails.title}</h4>
                      <span className="reminder-date">
                        {formatReminderDateTime(reminderDetails.dateTime)}
                        {reminderDetails.sendEmail && (
                          <span className="notification-indicator" title="Notificación por email activada"></span>
                        )}
                      </span>
                    </div>
                    {reminderDetails.description && (
                      <div className="reminder-quick-view-body">
                        <p>{reminderDetails.description}</p>
                      </div>
                    )}
                    <div className="reminder-quick-view-footer">
                      <span className={`reminder-status status-${reminderDetails.statusId}`}>
                        {reminderDetails.statusId === 1 ? 'Pendiente' : 
                         reminderDetails.statusId === 2 ? 'Completado' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showCreateForm && (
                <div className="create-reminder-form-container">
                  <h3>Nuevo Recordatorio</h3>
                  <ReminderForm
                    newReminder={newReminder}
                    selectedDate={selectedDate}
                    selectedStatus={selectedStatus}
                    setNewReminder={setNewReminder}
                    setSelectedStatus={setSelectedStatus}
                    handleCreateReminder={handleCreateReminder}
                    handleDateSelect={handleDateSelect}
                  />
                  <button 
                    className="cancel-create-button"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="week-view-popup-footer">
          <div className="footer-actions">
            <button 
              className="view-full-calendar-button"
              onClick={() => {
                window.location.href = '/reminders';
                onClose();
              }}
            >
              Ver calendario completo
            </button>
            
            <button 
              className="create-reminder-button"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <i className="fas fa-plus"></i> {showCreateForm ? "Ocultar formulario" : "Nuevo recordatorio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekViewPopup;
