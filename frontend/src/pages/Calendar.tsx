import React, { useState, useEffect } from 'react';
import { calendarService } from '../services/api';
import { Reminder, NewReminder, EditingReminder, UpdateReminderData } from '../types';
import '../styles/calendar.css';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [focusedReminder, setFocusedReminder] = useState<Reminder | null>(null);
  const [editingReminder, setEditingReminder] = useState<EditingReminder | null>(null);
  const [editingStatus, setEditingStatus] = useState<number>(focusedReminder?.statusId || 1);

  const [newReminder, setNewReminder] = useState<NewReminder>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    statusId: 1,
    hasTime: false
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
        
        console.log('Fetching reminders for range:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
  
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
  }, [currentMonth, selectedDate]); // Mantener ambas dependencias

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  const ReminderPopup = ({ date, reminders, onClose }: { 
    date: Date, 
    reminders: Reminder[], 
    onClose: () => void 
  }) => (
    <div className="reminder-popup-overlay" onClick={onClose}>
      <div className="reminder-popup" onClick={e => e.stopPropagation()}>
        <div className="reminder-popup-header">
          <h3>{date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="reminder-popup-content">
          {reminders.map((reminder, idx) => (
            <div 
              key={idx}
              className={`reminder-popup-item status-${reminder.statusId}`}
            >
              <div className="reminder-popup-details">
                <div className="reminder-popup-title">{reminder.title}</div>
                <div className="reminder-popup-description">{reminder.description}</div>
                <div className="reminder-popup-footer">
                <div className="reminder-info">
                  {reminder.hasTime && (
                    <span className="reminder-time">
                      {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                  <span className="reminder-status">
                    {reminder.statusId === 1 && "Pendiente"}
                    {reminder.statusId === 2 && "Completado"}
                    {reminder.statusId === 3 && "Cancelado"}
                  </span>
                </div>
                <button 
                  className="edit-button"
                  onClick={() => {/* ... */}}
                >
                  Editar
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  
  useEffect(() => {
    return () => {
      if (focusedReminder) {
        document.body.style.overflow = '';
      }
    };
  }, [focusedReminder]);
  
  useEffect(() => {
    if (editingReminder) {
      const textarea = document.querySelector('.reminder-edit-content textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  }, [editingReminder]);
  
  


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
          <div className="day-header">
            <span className="weekday-label">
              {date.toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
            <span className="day-number">{day}</span>
          </div>
          {dayReminders.length > 0 && renderDayReminders(dayReminders, date)}
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
          {dayReminders.length > 0 && renderDayReminders(dayReminders, date)}
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
          <div className="day-header">
            <span className="weekday-label">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]}
            </span>
            <span className="day-number">{i}</span>
          </div>
          {dayReminders.length > 0 && renderDayReminders(dayReminders, nextMonthDate)}
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
        hasTime: newReminder.hasTime
      };
  
      console.log('Creating reminder with data:', reminderData); // Para debug
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
  

  const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
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
        console.log('Estado actual del recordatorio:', {
            focusedReminder,
            editingReminder,
            editingStatus
        });

        const updatePayload: UpdateReminderData = {
            title: editingReminder.title,
            description: editingReminder.description,
            date_time: editingReminder.dateTime.toISOString(),
            status_id: editingStatus, // Usar el estado de edición
            has_time: editingReminder.hasTime // Asegurarse de enviar hasTime
        };

        console.log('Enviando actualización:', updatePayload);

        const response = await calendarService.updateReminder(
            focusedReminder.id,
            updatePayload
        );

        console.log('Respuesta recibida:', response);

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
    document.body.style.overflow = '';
  };

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return start;
  };

    // Añade la función para verificar si un día tiene recordatorios
    const hasReminders = (date: Date) => {
      return reminders.some(reminder => {
        const reminderDate = new Date(reminder.dateTime);
        return (
          reminderDate.getDate() === date.getDate() &&
          reminderDate.getMonth() === date.getMonth() &&
          reminderDate.getFullYear() === date.getFullYear()
        );
      });
    };
  
    // Añade la función para generar el mini calendario
    const generateMiniCalendarDays = () => {
      const days: React.ReactElement[] = [];
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startingDayIndex = (firstDay.getDay() + 6) % 7;
      const daysInMonth = lastDay.getDate();
  
      // Días del mes anterior
      const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
      for (let i = 0; i < startingDayIndex; i++) {
        const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
        days.push(
          <div key={`prev-${i}`} className="mini-day other-month">
            {day}
          </div>
        );
      }
  
      // Días del mes actual
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const isToday = date.toDateString() === new Date().toDateString();
        const hasRemindersForDay = hasReminders(date);
  
        days.push(
          <div
            key={`day-${day}`}
            className={`mini-day 
              ${isToday ? 'today' : ''} 
              ${hasRemindersForDay ? 'has-reminders' : ''}
              ${date.toDateString() === selectedDate.toDateString() ? 'selected' : ''}
            `}
            onClick={() => handleDateSelect(date)}
          >
            {day}
          </div>
        );
      }
  
      // Días del mes siguiente
      const remainingCells = 42 - days.length;
      for (let i = 1; i <= remainingCells; i++) {
        days.push(
          <div key={`next-${i}`} className="mini-day other-month">
            {i}
          </div>
        );
      }
  
      return days;
    };

  const generateWeekDaysHeader = () => {
    // Usar la fecha actual si no hay una fecha seleccionada
    const baseDate = selectedDate || new Date();
    const weekStart = getWeekStart(baseDate);
    
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  
    return (
      <div className="weekdays-header">
        {weekDays.map((date, index) => {
          const dayName = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][index];
          const dayReminders = reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dateTime);
            return (
              reminderDate.getDate() === date.getDate() &&
              reminderDate.getMonth() === date.getMonth() &&
              reminderDate.getFullYear() === date.getFullYear()
            );
          });
    
          dayReminders.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateA.getTime() - dateB.getTime();
          });
    
          return (
            <div 
              key={`${dayName}-${date.getDate()}`} 
              className={`weekday-header-item ${
                date.getMonth() !== currentMonth.getMonth() ? 'other-month' : ''
              } ${
                date.toDateString() === new Date().toDateString() ? 'today' : ''
              } ${
                date.toDateString() === selectedDate?.toDateString() ? 'selected' : ''
              }`}
              onClick={() => handleDateSelect(date)}
            >
              <div className="weekday-header-top">
                <span className="weekday-name">{dayName}</span>&nbsp;
                <span className="weekday-number">{date.getDate()}</span>&nbsp;
                <span className="month-indicator">
                  {date.toLocaleDateString('es-ES', { month: 'short' })}
                </span>
              </div>
              {dayReminders.length > 0 && renderHeaderReminders(dayReminders, date)}
            </div>
          );
        })}
      </div>
    );
    
  };

  const renderReminderTime = (reminder: Reminder) => {
    console.log('Reminder:', reminder);
    if (!reminder.hasTime) {
      return null;
    }
    return (
      <span className="reminder-time">
        {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    );
  };

  const renderFocusedReminder = () => {
    if (!focusedReminder) return null;
    
    return (
      <div className="reminder-popup-overlay" onClick={() => {
        setFocusedReminder(null);
        setEditingReminder(null);
        document.body.style.overflow = '';
      }}>
        <div 
          className={`reminder-card focused status-${focusedReminder.statusId}`}
          onClick={e => e.stopPropagation()}
        >
          {!editingReminder ? (
            // Modo visualización
            <div className="reminder-view-content">
              <h3>{focusedReminder.title}</h3>
              <div className="reminder-datetime">
                <div className="reminder-date">
                  {new Date(focusedReminder.dateTime).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
                {focusedReminder.hasTime && (
                  <div className="reminder-time">
                    {new Date(focusedReminder.dateTime).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                )}
              </div>
              <div className="reminder-description">
                {focusedReminder.description || 'Sin descripción'}
              </div>
              <button 
                className="edit-button"
                onClick={() => {
                  setEditingStatus(focusedReminder.statusId);
                  setEditingReminder({
                    title: focusedReminder.title,
                    description: focusedReminder.description ?? '',
                    dateTime: new Date(focusedReminder.dateTime),
                    hasTime: focusedReminder.hasTime
                  });
                }}
              >
                Editar
              </button>
            </div>
          ) : (
            // Modo edición
            <div className="reminder-edit-content">
            <input
              type="text"
              value={editingReminder.title}
              onChange={e => 
                setEditingReminder(prev => 
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
              placeholder="Título del recordatorio"
            />
            <textarea
              value={editingReminder.description}
              onChange={e => 
                setEditingReminder(prev => 
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
              placeholder="Descripción del recordatorio"
            />
              <div className="date-time-container">
                <input
                  type="date"
                  value={formatDateForInput(editingReminder.dateTime)}
                  onChange={e => {
                    const newDate = new Date(e.target.value);
                    setEditingReminder(prev => {
                      if (!prev) return null;
                      const updatedDateTime = new Date(prev.dateTime);
                      updatedDateTime.setFullYear(newDate.getFullYear());
                      updatedDateTime.setMonth(newDate.getMonth());
                      updatedDateTime.setDate(newDate.getDate());
                      return { ...prev, dateTime: updatedDateTime };
                    });
                  }}
                />
                <div className="time-input-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingReminder.hasTime}
                      onChange={e => 
                        setEditingReminder(prev => 
                          prev ? { ...prev, hasTime: e.target.checked } : null
                        )
                      }
                    />
                    Incluir hora
                  </label>
                  {editingReminder.hasTime && (
                    <input
                      type="time"
                      value={editingReminder.dateTime.toTimeString().slice(0, 5)}
                      onChange={e => {
                        const [hours, minutes] = e.target.value.split(':');
                        setEditingReminder(prev => {
                          if (!prev) return null;
                          const updatedDateTime = new Date(prev.dateTime);
                          updatedDateTime.setHours(parseInt(hours), parseInt(minutes));
                          return { ...prev, dateTime: updatedDateTime };
                        });
                      }}
                    />
                  )}
                </div>
              </div>
              <select
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(Number(e.target.value))}
                  className="status-selector"
                >
                  <option value={1}>Pendiente</option>
                  <option value={2}>Completado</option>
                  <option value={3}>Cancelado</option>
                </select>
              <div className="reminder-popup-actions">
                <button onClick={handleSaveReminder}>Guardar</button>
                <button onClick={() => setEditingReminder(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  
  
  
  


  // Función para el calendario (MAX_VISIBLE_REMINDERS = 1)
  const renderDayReminders = (dayReminders: Reminder[], date: Date) => {
    const MAX_VISIBLE_REMINDERS = 1;
    const hasMoreReminders = dayReminders.length > MAX_VISIBLE_REMINDERS;
  
    return (
      <div className="reminders-container">
        {dayReminders.slice(0, MAX_VISIBLE_REMINDERS).map((reminder, idx) => (
          <div 
            key={`reminder-${reminder.id}-${idx}`}
            className={`reminder-pill status-${reminder.statusId} ${
              focusedReminder?.id === reminder.id ? 'focused' : ''
            }`}
            onClick={(e) => handleReminderClick(reminder, e)}
          >
            {renderReminderTime(reminder)}
            <span className="reminder-title">{reminder.title}</span>
            {focusedReminder?.id === reminder.id && (
              <div className="reminder-description">
                {reminder.description}
              </div>
            )}
          </div>
        ))}
  
        {hasMoreReminders && (
          <button 
            className="show-more-reminders"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedDay(date);
            }}
          >
            +{dayReminders.length - MAX_VISIBLE_REMINDERS} más
          </button>
        )}
      </div>
    );
  };
  
  

  // Función para el header (MAX_VISIBLE_REMINDERS = 2)
  const renderHeaderReminders = (dayReminders: Reminder[], date: Date) => {
    const MAX_VISIBLE_REMINDERS = 2;
    const hasMoreReminders = dayReminders.length > MAX_VISIBLE_REMINDERS;
  
    return (
      <>
        <div 
          className={`reminder-overlay ${focusedReminder ? 'active' : ''}`}
          onClick={handleCloseReminder}
        />
  
        <div className="reminders-container">
          {dayReminders.slice(0, MAX_VISIBLE_REMINDERS).map((reminder, idx) => (
            <div 
              key={`reminder-${idx}`}
              className={`reminder-pill status-${reminder.statusId} ${
                focusedReminder?.id === reminder.id ? 'focused' : ''
              }`}
              onClick={(e) => handleReminderClick(reminder, e)}
            >
              {renderReminderTime(reminder)}
              <span className="reminder-title">{reminder.title}</span>
              {focusedReminder?.id === reminder.id && (
                <div className="reminder-description">
                  {reminder.description}
                </div>
              )}
            </div>
          ))}
  
          {hasMoreReminders && (
            <button 
              className="show-more-reminders"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDay(date);
              }}
            >
              +{dayReminders.length - MAX_VISIBLE_REMINDERS} más
            </button>
          )}
        </div>
      </>
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
      
      <div className="date-time-container">
        <div className="date-input">
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={e => {
              const newDate = new Date(e.target.value);
              handleDateSelect(newDate);
            }}
          />
        </div>
        
        <div className="time-checkbox-container">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newReminder.hasTime}
              onChange={e => setNewReminder(prev => ({ 
                ...prev, 
                hasTime: e.target.checked,
                time: e.target.checked ? prev.time || '00:00' : ''
              }))}
            />
            Incluir hora
          </label>
          
          {newReminder.hasTime && (
            <input
              type="time"
              value={newReminder.time}
              onChange={e => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
            />
          )}
        </div>
      </div>
      
      {renderStatusSelector()}
      <button onClick={handleCreateReminder}>Crear Recordatorio</button>
    </div>
  );
  

  return (
    <div className="calendar-container">
      {!showFullCalendar ? (
        <>
          <div className="calendar-header">
              <button 
                className="nav-button nav-button-prev" 
                onClick={() => {
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
                onClick={() => {
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
              <div className="calendar-mini-grid">
                <div className="mini-calendar-container">
                  <div className="mini-calendar-header">
                    <button 
                      className="nav-button"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      &lt;
                    </button>
                    <span>
                      {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      className="nav-button"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="mini-calendar-weekdays">
                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
                      <div key={day} className="mini-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="mini-calendar-days">
                    {generateMiniCalendarDays()}
                  </div>
                  <button 
                    className="expand-calendar-button"
                    onClick={() => setShowFullCalendar(true)}
                  >
                    Ver calendario completo
                  </button>
                </div>
              </div>
              {renderReminderForm()}
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
                onClick={() => {
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
                onClick={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentMonth(newDate);
                }}
              >
                {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                  .toLocaleDateString('es-ES', { month: 'long' })}
              </button>
            </div>
              <div className="calendar-and-form">
                <div className="calendar-grid">
                  {generateCalendarDays()}
                </div>
                {renderReminderForm()}
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
        />
      )}
      {focusedReminder && renderFocusedReminder()}
    </div>
  );
  
  
};

export default Calendar;