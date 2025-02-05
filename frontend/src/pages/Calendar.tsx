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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    statusId: 1
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, [selectedDate]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        setIsLoading(true);
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        console.log('Cargando recordatorios para:', {
          firstDay: firstDay.toISOString(),
          lastDay: lastDay.toISOString()
        });

        const response = await calendarService.getReminders({
          startDate: firstDay,
          endDate: lastDay
        });

        if (response && response.reminders) {
          console.log('Recordatorios cargados:', response.reminders);
          setReminders(response.reminders);
        }
      } catch (error) {
        console.error('Error cargando recordatorios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();
  }, [currentMonth]);



  const loadNotas = async () => {
    try {
      setIsLoading(true);
      // Obtener el primer y último día del mes actual
      const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      // Llamar al servicio para obtener los recordatorios (las "notas" existentes)
      const response = await calendarService.getReminders({
        startDate: firstDay,
        endDate: lastDay
      });
      
      // Si se retorna correctamente la respuesta, actualiza el estado de los recordatorios
      if (response && response.reminders) {
        setReminders(response.reminders);
      }
    } catch (error) {
      console.error('Error al cargar las notas:', error);
    } finally {
      setIsLoading(false);
    }
  };
  

  const reloadReminders = async () => {
    try {
      const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const response = await calendarService.getReminders({
        startDate: firstDay,
        endDate: lastDay
      });       
      if (response && response.reminders) {
        setReminders(response.reminders);
      }
    } catch (error) {
      console.error('Error reloading reminders:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
      const response = await calendarService.getReminders({
        startDate: firstDay,
        endDate: lastDay
      });
  
      if (response && response.reminders) {
        // Especificar el tipo Reminder para el parámetro
        const transformedReminders = response.reminders.map((reminder: Reminder) => ({
          ...reminder,
          dateTime: new Date(reminder.dateTime)
        }));
        setReminders(transformedReminders);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };
  

  const generateCalendarDays = (): React.ReactElement => {
    const days: React.ReactElement[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startingDayIndex = (firstDay.getDay() + 6) % 7; // Ajuste para que la semana empiece en lunes
    const daysInMonth = lastDay.getDate();
    
    const totalCells = 42;
  
    // Función auxiliar para obtener los recordatorios de un día específico
    const getDayReminders = (date: Date) => {
      const dayReminders = reminders.filter(reminder => {
        const reminderDate = new Date(reminder.dateTime);
        const match = 
          reminderDate.getDate() === date.getDate() &&
          reminderDate.getMonth() === date.getMonth() &&
          reminderDate.getFullYear() === date.getFullYear();
        
        console.log(`Comparando recordatorio:`, {
          reminderDate,
          currentDate: date,
          match
        });
        
        return match;
      });
      
      console.log(`Recordatorios para ${date.toDateString()}:`, dayReminders);
      return dayReminders;
    };
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    for (let i = 0; i < startingDayIndex; i++) {
      const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
      const prevMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, day);
      const dayReminders = getDayReminders(prevMonthDate);
      
      days.push(
        <div key={`prev-${i}`} className="day other-month">
          <span className="weekday-label">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i % 7]}
          </span>
          <span className="day-number">{day}</span>
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
      const nextMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, i);
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
        dateTime: dateTime, // Asegúrate de que coincida con la interfaz
        statusId: selectedStatus // Cambiado de status_id a statusId
      };
  
      const response = await calendarService.createReminder(reminderData);
  
      if (response.reminder) {
        await fetchReminders();        
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
    setSelectedDate(new Date(date));
    setCurrentWeekStart(date);
    
    // Actualizar el formulario con la fecha seleccionada
    setNewReminder(prev => ({
      ...prev,
      date: date,
      time: prev.time || '00:00' // Establece una hora por defecto si no hay ninguna
    }));
  };

  const getRemindersByDate = (date: Date) => {
    return reminders.filter(reminder => {
      const reminderDate = new Date(reminder.dateTime);
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Función para agrupar los recordatorios por fecha
  const getReminders = async (startDate: Date, endDate: Date) => {
    try {
      const response = await fetch(`/api/reminders?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener recordatorios');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getReminders:', error);
      throw error;
    }
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
                key={`${day.date}-${idx}`}
                className={`reminder-pill status-${reminder.statusId}`}
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
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
    
    return (
      <div className="weekdays-header">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day, index) => {
          const currentDate = new Date(weekStart);
          currentDate.setDate(weekStart.getDate() + index);
          
          const dayReminders = reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dateTime);
            return (
              reminderDate.getDate() === currentDate.getDate() &&
              reminderDate.getMonth() === currentDate.getMonth() &&
              reminderDate.getFullYear() === currentDate.getFullYear()
            );
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