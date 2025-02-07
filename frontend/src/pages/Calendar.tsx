import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/api';
import { Reminder } from '../types';
import '../styles/calendar.css';

interface NewReminder {
  title: string;
  description: string;
  date: Date;
  time: string;
  statusId?: number;
}

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    statusId: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  

  useEffect(() => {
    const loadReminders = async () => {
      try {
        setIsLoading(true);
        
        // Obtener el primer día visible del calendario (incluyendo días del mes anterior)
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const startingDayIndex = (firstDay.getDay() + 6) % 7;
        const visibleStartDate = new Date(firstDay);
        visibleStartDate.setDate(visibleStartDate.getDate() - startingDayIndex);
  
        // Obtener el último día visible del calendario (incluyendo días del mes siguiente)
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const remainingDays = 42 - (startingDayIndex + daysInMonth); // 42 es el total de celdas del calendario
        const visibleEndDate = new Date(lastDay);
        visibleEndDate.setDate(visibleEndDate.getDate() + remainingDays);
  
        console.log('Fetching reminders for range:', {
          startDate: visibleStartDate.toISOString(),
          endDate: visibleEndDate.toISOString()
        });
  
        const response = await calendarService.getReminders({
          startDate: visibleStartDate,
          endDate: visibleEndDate
        });
  
        if (response && response.reminders) {
          const transformedReminders = response.reminders.map((reminder: Reminder) => ({
            ...reminder,
            dateTime: new Date(reminder.dateTime)
          }));
          
          console.log('Transformed reminders:', transformedReminders);
          setReminders(transformedReminders);
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    loadReminders();
  }, [currentMonth]); // Solo depende del mes actual
  

  const generateCalendarDays = (): React.ReactElement => {
    const days: React.ReactElement[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startingDayIndex = (firstDay.getDay() + 6) % 7; // Ajuste para que la semana empiece en lunes
    const daysInMonth = lastDay.getDate();
    
    const totalCells = 42;
  
    // Función auxiliar para obtener los recordatorios de un día específico
    const getDayReminders = (date: Date) => {
      return reminders.filter(reminder => {
        const reminderDate = new Date(reminder.dateTime);
        return (
          reminderDate.getDate() === date.getDate() &&
          reminderDate.getMonth() === date.getMonth() &&
          reminderDate.getFullYear() === date.getFullYear()
        );
      });
    };
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    for (let i = 0; i < startingDayIndex; i++) {
      const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
      const dayReminders = getDayReminders(date);
      
      days.push(
        <div key={`prev-${i}`} className="day other-month">
          <span className="weekday-label">
            {date.toLocaleDateString('es-ES', { weekday: 'short' })}
          </span>
          <span className="day-number">{day}</span>
          <div className="reminders-container">
            {dayReminders.map((reminder, idx) => (
              <div 
                key={`reminder-${reminder.id}-${idx}`}
                className={`reminder-pill status-${reminder.statusId}`}
                title={reminder.description}
              >
                <span className="reminder-time">
                  {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="reminder-title">{reminder.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isCurrentDay = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const dayReminders = getDayReminders(date);
  
      days.push(
        <div
          key={`day-${day}`}
          className={`day ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleDateSelect(date)}
        >
          <div className="day-header">
            <span className="weekday-label">
              {date.toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
            <span className="day-number">{day}</span>
          </div>
          <div className="reminders-container">
            {dayReminders.length > 0 && dayReminders.map((reminder, idx) => (
              <div 
                key={`reminder-${idx}`}
                className={`reminder-pill status-${reminder.statusId}`}
                title={reminder.description}
              >
                <span className="reminder-time">
                  {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="reminder-title">{reminder.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  
  
    // Días del mes siguiente
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
        const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
        const dayReminders = getDayReminders(nextMonthDate);
        const dayIndex = (startingDayIndex + daysInMonth + i - 1) % 7;
      
      days.push(
        <div key={`next-${i}`} className="day other-month">
          <span className="weekday-label">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]}
          </span>
          <span className="day-number">{i}</span>
          <div className="reminders-container">
            {dayReminders.map((reminder, idx) => (
              <div 
                key={idx}
                className={`reminder-pill status-${reminder.statusId}`}
                title={reminder.description}
              >
                <span className="reminder-time">
                  {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="reminder-title">{reminder.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  
    return (
      <div className="calendar-days-grid">
        {days}
      </div>
    );
  };
  
  
  const handleCreateReminder = async () => {
    try {
      if (!newReminder.title) {
        alert('Por favor ingresa un título');
        return;
      }
  
      const dateTime = new Date(newReminder.date);
      const [hours, minutes] = newReminder.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));
  
      const reminderData = {
        title: newReminder.title,
        description: newReminder.description,
        dateTime: dateTime,
        statusId: selectedStatus
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
          statusId: 1
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al crear el recordatorio');
    }
  };
  

  const renderStatusSelector = () => (
    <select
      value={selectedStatus}
      onChange={(e) => setSelectedStatus(Number(e.target.value))}
      className="status-selector"
    >
      <option value={1}>Pendiente</option>
      <option value={2}>Completado</option>
      <option value={3}>Cancelado</option>
    </select>
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Actualizar el mes actual si el día seleccionado es de otro mes
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    
    // Actualizar el formulario de nuevo recordatorio
    setNewReminder(prev => ({
      ...prev,
      date: date,
      time: prev.time || '00:00'
    }));
  };

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return start;
  };

  const generateWeekDaysHeader = () => {
    // Obtener el primer día de la semana para una fecha dada
    const getWeekStart = (date: Date) => {
      const start = new Date(date);
      const day = start.getDay();
      // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return start;
    };

    // Usar selectedDate en lugar de currentMonth para determinar la semana
    const weekStart = getWeekStart(selectedDate);
    
    // Generar array con todos los días de la semana
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });

    return (
      <div className="weekdays-header">
        {weekDays.map((date, index) => {
          const dayName = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][index];
          
          // Filtrar los recordatorios para este día específico
          const dayReminders = reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dateTime);
            return (
              reminderDate.getDate() === date.getDate() &&
              reminderDate.getMonth() === date.getMonth() &&
              reminderDate.getFullYear() === date.getFullYear()
            );
          });

          // Ordenar los recordatorios por hora
          dayReminders.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateA.getTime() - dateB.getTime();
          });

          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();

          return (
            <div 
              key={`${dayName}-${date.getDate()}`} 
              className={`weekday-header-item ${!isCurrentMonth ? 'other-month' : ''} 
                        ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDateSelect(date)}
            >
              <div className="weekday-header-top">
                <span className="weekday-name">{dayName}</span>&nbsp;
                <span className="weekday-number">{date.getDate()}</span>&nbsp;
                <span className="month-indicator">
                  {date.toLocaleDateString('es-ES', { month: 'short' })}
                </span>
              </div>
              <div className="reminders-container">
                {dayReminders.map((reminder, idx) => (
                  <div 
                    key={`${reminder.id}-${idx}`}
                    className={`reminder-pill status-${reminder.statusId}`}
                    title={reminder.description || reminder.title}
                  >
                    <span className="reminder-time">
                      {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="reminder-title">{reminder.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };



  const renderReminderForm = () => (
    <div className="reminder-form">
      <input
        type="text"
        placeholder="Título del recordatorio"
        value={newReminder.title}
        onChange={e => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
      />
      <textarea
        placeholder="Descripción"
        value={newReminder.description}
        onChange={e => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
      />
      <input
        type="date"
        value={newReminder.date.toISOString().split('T')[0]}
        onChange={e => setNewReminder(prev => ({ ...prev, date: new Date(e.target.value) }))}
      />
      <input
        type="time"
        value={newReminder.time}
        onChange={e => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
      />
      {renderStatusSelector()}
      <button onClick={handleCreateReminder}>Crear Recordatorio</button>
    </div>
  );

  return (
    <div className="calendar-container">

      <div className="calendar-header">
        <button 
          className="nav-button nav-button-prev" 
          onClick={async () => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentMonth(newDate);
          }}
        >
          {new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            .toLocaleDateString('es-ES', { month: 'long' })}
        </button>
        
        <h2>{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
        
        <button 
          className="nav-button nav-button-next" 
          onClick={async () => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentMonth(newDate);
          }}
        >
          {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            .toLocaleDateString('es-ES', { month: 'long' })}
        </button>
      </div>


      <div className="main-content">
          {generateWeekDaysHeader()}

          <div className="calendar-and-form">
            <div className="calendar-grid">
              {generateCalendarDays()}
            </div>
            {renderReminderForm()}
        </div>
      </div>
    </div>

  );
};

export default Calendar;