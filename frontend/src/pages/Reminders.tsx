import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/api';
import { Reminder, NewReminder, EditingReminder, UpdateReminderData } from '../types';
import '../styles/reminders.css';

// Importar componentes
import ReminderForm from '../components/Reminders/ReminderForm';
import ReminderDetail from '../components/Reminders/ReminderDetail';
import ReminderPopup from '../components/Reminders/ReminderPopup';
import MiniCalendar from '../components/Reminders/MiniCalendar';
import CalendarGrid from '../components/Reminders/CalendarGrid';
import WeekView from '../components/Reminders/WeekView';
import ReminderDashboard from '../components/Reminders/ReminderDashboard';
import { getWeekStart } from '../components/Reminders/ReminderUtils';


const Reminders: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [focusedReminder, setFocusedReminder] = useState<Reminder | null>(null);
  const [editingReminder, setEditingReminder] = useState<EditingReminder | null>(null);
  const [editingStatus, setEditingStatus] = useState<number>(focusedReminder?.statusId || 1);
  const [isFromPopup, setIsFromPopup] = useState(false);
  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    statusId: 1,
    hasTime: false,
    sendEmail: false
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  
  useEffect(() => {
    const loadReminders = async () => {
      try {
        // Obtener el primer día de la semana actual
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        // Obtener el primer y último día del mes visible
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Calcular el rango más amplio que incluya tanto la semana como el mes
        const startDate = new Date(Math.min(weekStart.getTime(), monthStart.getTime()));
        startDate.setDate(startDate.getDate() - 7); // Una semana extra antes
        
        const endDate = new Date(Math.max(weekEnd.getTime(), monthEnd.getTime()));
        endDate.setDate(endDate.getDate() + 7); // Una semana extra después
        
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
      }
    };
  
    loadReminders();
  }, [currentMonth, selectedDate]);

  // Restaurar overflow al desmontar para evitar que el scroll quede bloqueado
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  useEffect(() => {
    if (editingReminder) {
      const textarea = document.querySelector('.reminder-edit-content textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  }, [editingReminder]);

  const handleCreateReminder = async () => {
    try {
      if (!newReminder.title) {
        alert('Por favor ingresa un título');
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
        // Usar la misma lógica de carga que en loadReminders
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const startingDayIndex = (firstDay.getDay() + 6) % 7;
        const visibleStartDate = new Date(firstDay);
        visibleStartDate.setDate(visibleStartDate.getDate() - startingDayIndex);
  
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const remainingDays = 42 - (startingDayIndex + daysInMonth);
        const visibleEndDate = new Date(lastDay);
        visibleEndDate.setDate(visibleEndDate.getDate() + remainingDays);
  
        const updatedResponse = await calendarService.getReminders({
          startDate: visibleStartDate,
          endDate: visibleEndDate
        });
  
        if (updatedResponse && updatedResponse.reminders) {
          setReminders(updatedResponse.reminders.map((reminder: Reminder) => ({
            ...reminder,
            dateTime: new Date(reminder.dateTime)
          })));
        }
  
        setNewReminder({
          title: '',
          description: '',
          date: new Date(),
          time: '',
          statusId: 1,
          hasTime: false
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al crear el recordatorio');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('¿Eliminar este recordatorio? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await calendarService.deleteReminder(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      // Cerrar el popup o modal
      setFocusedReminder(null);
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setNewReminder(prev => ({
      ...prev,
      date: date
    }));
    
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleReminderClick = (reminder: Reminder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusedReminder(reminder);
    setEditingReminder(null);
    document.body.style.overflow = 'hidden';
  };

  const handleSaveReminder = async () => {
    if (!focusedReminder || !editingReminder) return;
    
    try {
        const updatePayload: UpdateReminderData = {
          title: editingReminder.title,
          description: editingReminder.description,
          date_time: editingReminder.dateTime.toISOString(),
          status_id: editingStatus,
          has_time: editingReminder.hasTime,
          send_email: editingReminder.sendEmail
        };

        const response = await calendarService.updateReminder(
            focusedReminder.id,
            updatePayload
        );

      if (response?.reminder) {
        // Actualizar el estado local
        setReminders(prev => 
          prev.map(reminder => 
            reminder.id === focusedReminder.id 
              ? {
                  ...response.reminder,
                  dateTime: new Date(response.reminder.date_time),
                  statusId: response.reminder.status_id,
                  hasTime: response.reminder.has_time
                }
              : reminder
          )
        );

        // Recargar recordatorios
        const startDate = new Date(currentMonth);
        startDate.setDate(1);
        startDate.setDate(startDate.getDate() - 7);
        
        const endDate = new Date(currentMonth);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setDate(endDate.getDate() + 7);

        const updatedResponse = await calendarService.getReminders({
          startDate,
          endDate
        });

        if (updatedResponse?.reminders) {
          setReminders(updatedResponse.reminders.map((r: Reminder) => ({
            ...r,
            dateTime: new Date(r.dateTime),
            statusId: r.statusId,
            hasTime: r.hasTime
          })));
        }

        setEditingReminder(null);
        setFocusedReminder(null);
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Error al actualizar recordatorio:', error);
    }
  };

  const handleCloseReminder = () => {
    setFocusedReminder(null);
    setEditingReminder(null);
    setIsFromPopup(false);
    document.body.style.overflow = '';
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  return (
    <div className="calendar-container">
      {!showFullCalendar ? (
        <>
          <div className="calendar-header">
              <button 
                className="nav-button nav-button-prev" 
                onClick={handlePrevMonth}
              >
                {new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
              </button>
              
              <h2>{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
              
              <button 
                className="nav-button nav-button-next" 
                onClick={handleNextMonth}
              >
                {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
              </button>
          </div>

          <div className="main">
            <WeekView
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              reminders={reminders}
              focusedReminder={focusedReminder}
              onDateSelect={handleDateSelect}
              onReminderClick={handleReminderClick}
              onShowMore={setExpandedDay}
            />
            
            <div className="calendar-and-form">
              <div className="calendar-mini-grid">
                <MiniCalendar
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  reminders={reminders}
                  onDateSelect={handleDateSelect}
                  onMonthChange={setCurrentMonth}
                />
              </div>
              
              {/* Nuevo componente Dashboard */}
              <div className="reminder-dashboard-container">
                <ReminderDashboard 
                  reminders={reminders}
                  onReminderClick={handleReminderClick}
                  selectedDate={selectedDate}
                />
              </div>
              
              <ReminderForm
                newReminder={newReminder}
                selectedDate={selectedDate}
                selectedStatus={selectedStatus}
                setNewReminder={setNewReminder}
                setSelectedStatus={setSelectedStatus}
                handleCreateReminder={handleCreateReminder}
                handleDateSelect={handleDateSelect}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="full-calendar-modal">
          <div className="full-calendar-content">
            <button 
              className="close-calendar-button"
              onClick={() => setShowFullCalendar(false)}
            >
              ×
            </button>
            <div className="calendar-header">
              <button 
                className="nav-button nav-button-prev" 
                onClick={handlePrevMonth}
              >
                {new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
              </button>
              
              <h2>{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
              
              <button 
                className="nav-button nav-button-next" 
                onClick={handleNextMonth}
              >
                {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
              </button>
            </div>
              <div className="calendar-and-form">
                <CalendarGrid
                  currentMonth={currentMonth}
                  selectedDate={selectedDate}
                  reminders={reminders}
                  focusedReminder={focusedReminder}
                  onDateSelect={handleDateSelect}
                  onReminderClick={handleReminderClick}
                  onShowMore={setExpandedDay}
                />
                <ReminderForm
                  newReminder={newReminder}
                  selectedDate={selectedDate}
                  selectedStatus={selectedStatus}
                  setNewReminder={setNewReminder}
                  setSelectedStatus={setSelectedStatus}
                  handleCreateReminder={handleCreateReminder}
                  handleDateSelect={handleDateSelect}
                />
              </div>
          </div>
        </div>
      )}
  
      {expandedDay && (
        <ReminderPopup
          date={expandedDay}
          reminders={reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dateTime);
            return (
              reminderDate.getDate() === expandedDay.getDate() &&
              reminderDate.getMonth() === expandedDay.getMonth() &&
              reminderDate.getFullYear() === expandedDay.getFullYear()
            );
          })}
          onClose={() => setExpandedDay(null)}
          onEditReminder={(reminder) => {
            setFocusedReminder(reminder);
            setEditingReminder({
              title: reminder.title,
              description: reminder.description ?? '',
              dateTime: new Date(reminder.dateTime),
              hasTime: reminder.hasTime,
              sendEmail: focusedReminder?.sendEmail || false
            });
            setIsFromPopup(true);
          }}
          onDeleteReminder={handleDeleteReminder}
          setIsFromPopup={setIsFromPopup}
        />
      )}
      
      {focusedReminder && (
        <ReminderDetail
          focusedReminder={focusedReminder}
          editingReminder={editingReminder}
          editingStatus={editingStatus}
          setEditingReminder={setEditingReminder}
          setEditingStatus={setEditingStatus}
          handleSaveReminder={handleSaveReminder}
          handleDeleteReminder={handleDeleteReminder}
          handleCloseReminder={handleCloseReminder}
          isFromPopup={isFromPopup}
          setIsFromPopup={setIsFromPopup}
        />
      )}
    </div>
  );
};

export default Reminders;
