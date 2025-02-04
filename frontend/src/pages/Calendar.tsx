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
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    statusId: 1
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
    const startingDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    
    const days: React.ReactElement[] = [];
    const totalCells = 42;
  
    // Función auxiliar para obtener los recordatorios de un día específico
    const getDayReminders = (date: Date) => {
      return reminders.filter(reminder => {
        const reminderDate = new Date(reminder.dateTime);
        return reminderDate.getDate() === date.getDate() &&
               reminderDate.getMonth() === date.getMonth() &&
               reminderDate.getFullYear() === date.getFullYear();
      });
    };
    
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
      const dayOfWeek = (startingDayIndex + day - 1) % 7;
      const dayReminders = reminders.filter(reminder => {
        const reminderDate = new Date(reminder.dateTime);
        return reminderDate.getDate() === date.getDate() &&
               reminderDate.getMonth() === date.getMonth() &&
               reminderDate.getFullYear() === date.getFullYear();
      });
  
      days.push(
        <div
          key={`current-${day}`}
          className={`day ${isCurrentDay ? 'today' : ''}`}
          onClick={() => handleDateSelect(date)}
        >
          <div className="day-header">
            <span className="weekday-label">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayOfWeek]}
            </span>
            <span className="day-number">{day}</span>
          </div>
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
      if (!newReminder.title) {
        alert('Por favor ingresa un título');
        return;
      }

      const dateTime = new Date(newReminder.date);
      const [hours, minutes] = newReminder.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));

      const response = await calendarService.createReminder({
        title: newReminder.title,
        description: newReminder.description,
        dateTime: dateTime,
        statusId: selectedStatus
      });

      if (response.reminder) {
        setReminders(prev => [...prev, response.reminder]);
        setNewReminder({
          title: '',
          description: '',
          date: new Date(),
          time: '',
          statusId: 1
        });
        await fetchReminders();
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

// Función para agrupar los recordatorios por fecha
const getRemindersByDate = (date: Date) => {
  return reminders.filter(reminder => {
    const reminderDate = new Date(reminder.dateTime);
    return reminderDate.getDate() === date.getDate() &&
           reminderDate.getMonth() === date.getMonth() &&
           reminderDate.getFullYear() === date.getFullYear();
  });
};

// Función para renderizar los días de la semana con sus recordatorios
const renderWeekDays = () => {
  const weekDays = [
    { name: 'LUN', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 17) },
    { name: 'MAR', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 18) },
    { name: 'MIÉ', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 19) },
    { name: 'JUE', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 20) },
    { name: 'VIE', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 21) },
    { name: 'SÁB', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 22) },
    { name: 'DOM', date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 23) }
  ];

  return (
    <div className="week-container">
      {weekDays.map((day, index) => (
        <div key={index} className="day-column">
          <div className="day-header">
            <div className="day-name">{day.name}</div>
            <div className="day-number">{day.date.getDate()}</div>
          </div>
          <div className="day-reminders">
            {getRemindersByDate(day.date).map((reminder, idx) => (
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
      ))}
    </div>
  );
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
    const weekStart = getWeekDays(selectedDate)[0];
    
    return (
      <div className="weekdays-header">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day, index) => {
          const currentDate = new Date(weekStart);
          currentDate.setDate(weekStart.getDate() + index);
          const dayReminders = reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dateTime);
            return reminderDate.getDate() === currentDate.getDate() &&
                   reminderDate.getMonth() === currentDate.getMonth() &&
                   reminderDate.getFullYear() === currentDate.getFullYear();
          });
  
          return (
            <div key={day} className="weekday-header-item">
              <div className="weekday-header-top">
                <span className="weekday-name">{day}</span>
                <span className="weekday-number">{currentDate.getDate()}</span>
              </div>
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
            {renderReminderForm()}
        </div>
      </div>
    </div>

  );
};

export default Calendar;