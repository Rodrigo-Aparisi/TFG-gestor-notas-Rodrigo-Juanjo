import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/api';
import { Reminder } from '../types';
import '../styles/calendar.css';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
    const startingDayIndex = firstDay.getDay();
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
  
  

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}>
          Anterior
        </button>
        <h2>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}>
          Siguiente
        </button>
      </div>

      <div className="calendar-grid">
        {/* Días de la semana */}
        <div className="weekdays">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="weekday">{day}</div>
            ))}
        </div>
        
        {/* Días del mes */}
        <div className="days">
            {generateCalendarDays()}
        </div>
    </div>

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
    
      <div className="reminders-list">
        {reminders.map(reminder => (
          <div key={reminder.id} className="reminder-card">
            <h3>{reminder.title}</h3>
            <p>{reminder.description}</p>
            <span>{new Date(reminder.dateTime).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
