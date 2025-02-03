import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/api';
import { Reminder } from '../types';
import '../styles/calendar.css';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: ''
  });

  useEffect(() => {
    fetchReminders();
  }, [selectedDate]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        await fetchReminders();
      } catch (error) {
        console.error('Error loading reminders:', error);
      }
    };
    
    loadReminders();
  }, [selectedDate]);

  const fetchReminders = async () => {
    try {
      const response = await calendarService.getReminders(selectedDate);
      setReminders(response.reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const generateCalendarDays = (): React.ReactElement => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startingDayIndex = (firstDay.getDay() + 6) % 7; // Ajuste para que la semana empiece en lunes
    const daysInMonth = lastDay.getDate();
    
    const days: React.ReactElement[] = [];
    const totalCells = 42; // 6 filas × 7 columnas
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    for (let i = 0; i < startingDayIndex; i++) {
      const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
      days.push(
        <div key={`prev-${i}`} className="day other-month">
          <span className="weekday-label">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i % 7]}
          </span>
          <span className="day-number">{day}</span>
        </div>
      );
    }
  
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isCurrentDay = date.toDateString() === new Date().toDateString();
      const isDateSelected = date.toDateString() === selectedDate.toDateString();
      const dayOfWeek = (startingDayIndex + day - 1) % 7;

      days.push(
        <div
          key={`current-${day}`}
          className={`day ${isCurrentDay ? 'today' : ''} ${isDateSelected ? 'selected' : ''}`}
          onClick={() => handleDateSelect(date)}
        >
          <span className="weekday-label">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayOfWeek]}
          </span>
          <span className="day-number">{day}</span>
        </div>
      );
    }
  
    // Días del mes siguiente
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const dayIndex = (startingDayIndex + daysInMonth + i - 1) % 7;
      days.push(
        <div key={`next-${i}`} className="day other-month">
          <span className="weekday-label">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]}
          </span>
          <span className="day-number">{i}</span>
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
      if (!newReminder.title || !newReminder.time) {
        alert('Por favor completa todos los campos');
        return;
      }
  
      const dateTime = new Date(newReminder.date);
      const [hours, minutes] = newReminder.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));
  
      const response = await calendarService.createReminder({
        title: newReminder.title,
        description: newReminder.description,
        dateTime: dateTime
      });
      
      if (response && response.reminder) {
        setReminders(prev => [...prev, response.reminder]);
        setNewReminder({
          title: '',
          description: '',
          date: new Date(),
          time: ''
        });
        // Recargar los recordatorios
        fetchReminders();
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error al crear el recordatorio');
    }
  };
  
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }
    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentWeekStart(date);
    
    // Actualizar el formulario con la fecha seleccionada
    setNewReminder(prev => ({
      ...prev,
      date: date,
      time: prev.time || '00:00' // Establece una hora por defecto si no hay ninguna
    }));
  };

  const generateWeekDays = () => {
    const weekDays = getWeekDays(selectedDate);
    return (
      <div className="weekdays-container">
        {weekDays.map((date, index) => (
          <div key={index} className="weekday-item">
            <div className="weekday-header">
              <span className="weekday-name">
                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
              </span>
              <span className="weekday-number">{date.getDate()}</span>
            </div>
            <div className="weekday-reminders">
              {reminders
                .filter(reminder => 
                  new Date(reminder.dateTime).toDateString() === date.toDateString()
                )
                .map(reminder => (
                  <div key={reminder.id} className="reminder-pill">
                    {reminder.title}
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    );
  };

  const generateWeekDaysHeader = () => {
    const weekStart = getWeekDays(selectedDate)[0]; // Obtiene el primer día de la semana actual
    
    return (
      <div className="weekdays-header">
        {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((day, index) => {
          const currentDate = new Date(weekStart);
          currentDate.setDate(weekStart.getDate() + index);
          
          return (
            <div key={day} className="weekday-header-item">
              <span className="weekday-name">{day}</span>
              <span className="weekday-number">{currentDate.getDate()}</span>
            </div>
          );
        })}
      </div>
    );
  };
  

  const generateWeekReminders = () => {
    const weekDays = getWeekDays(selectedDate);
    
    return (
      <div className="weekdays-header-with-reminders">
        <div className="weekdays-header">
          {weekDays.map((date, index) => (
            <div key={index} className="weekday-column">
              <div className="weekday-header-item">
                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
              </div>
              <div className="weekday-reminders">
                {reminders
                  .filter(reminder => 
                    new Date(reminder.dateTime).toDateString() === date.toDateString()
                  )
                  .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                  .map(reminder => (
                    <div key={reminder.id} className="reminder-card">
                      <div className="reminder-time">
                        {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="reminder-title">{reminder.title}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  return (
    <div className="calendar-container">

      <div className="calendar-header">
          <button className="nav-button nav-button-prev" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
          }}>
              {new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
          </button>
          
          <h2>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
          
          <button className="nav-button nav-button-next" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
          }}>
              {new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
          </button>
      </div>


      <div className="main-content">
        {generateWeekDaysHeader()}

        <div className="calendar-and-form">
          <div className="calendar-grid">
              {generateCalendarDays()}
          </div>
          
          {/* Formulario de recordatorio */}
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
            <button onClick={handleCreateReminder}>Crear Recordatorio</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Calendar;


