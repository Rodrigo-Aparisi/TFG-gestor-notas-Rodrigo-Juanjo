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
    const startingDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    
    const days: React.ReactElement[] = [];
  
    // Agregar días vacíos hasta el primer día del mes
    for (let i = 0; i < startingDayIndex; i++) {
      days.push(
        <div key={`empty-${i}`} className="day empty"></div>
      );
    }
  
    // Agregar los días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const isSelected = currentDate.toDateString() === selectedDate.toDateString();
  
      days.push(
        <div
          key={day}
          className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedDate(new Date(currentDate))}
        >
          <span className="day-number">{day}</span>
          {reminders.some(reminder => 
            new Date(reminder.dateTime).toDateString() === currentDate.toDateString()
          ) && (
            <div className="reminder-indicator"></div>
          )}
        </div>
      );
    }
  
    // Retornar un elemento contenedor con todos los días
    return (
      <div className="calendar-days-grid">
        {days}
      </div>
    );
  };

  const handleCreateReminder = async () => {
    try {
      const response = await calendarService.createReminder({
        ...newReminder,
        dateTime: new Date(`${newReminder.date.toDateString()} ${newReminder.time}`)
      });
      
      if (response && response.reminder) {
        setReminders(prev => [...prev, response.reminder]);
        setNewReminder({ title: '', description: '', date: new Date(), time: '' });
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
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

  return (
    <div className="calendar-container">
      <div className="calendar-header">
          <button onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
          }}>
              <span>◀</span> {new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
          </button>
          
          <h2>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
          
          <button onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
          }}>
              {new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })} <span>▶</span>
          </button>
      </div>

      <div className="main-content">
        <div className="calendar-section">
          {generateWeekDays()}
          <div className="calendar-grid">
            {generateCalendarDays()}
          </div>
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
  );
};

export default Calendar;


