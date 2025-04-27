import React from 'react';
import { Reminder } from '../../types';
import ReminderList from './ReminderList';
import { getWeekStart, getDayReminders } from './ReminderUtils';

interface WeekViewProps {
  selectedDate: Date;
  currentMonth: Date;
  reminders: Reminder[];
  focusedReminder: Reminder | null;
  onDateSelect: (date: Date) => void;
  onReminderClick: (reminder: Reminder, e: React.MouseEvent) => void;
  onShowMore: (date: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  selectedDate,
  currentMonth,
  reminders,
  focusedReminder,
  onDateSelect,
  onReminderClick,
  onShowMore
}) => {
  // Genera la vista de cabeceras de los días de la semana
  const generateWeekDaysHeader = () => {
    // Usar la fecha actual si no hay una fecha seleccionada
    const baseDate = selectedDate || new Date();
    const weekStart = getWeekStart(baseDate);
    
    // Crear un array con los 7 días de la semana
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  
    return (
      <div className="weekdays-header">
        {weekDays.map((date, index) => {
          const dayName = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][index];
          // Obtener los recordatorios para este día
          const dayReminders = getDayReminders(reminders, date);
    
          // Ordenar los recordatorios por hora
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
              onClick={() => onDateSelect(date)}
            >
              <div className="weekday-header-top">
                <span className="weekday-name">{dayName}</span>&nbsp;
                <span className="weekday-number">{date.getDate()}</span>&nbsp;
                <span className="month-indicator">
                  {date.toLocaleDateString('es-ES', { month: 'short' })}
                </span>
              </div>
              {/* Renderizar los recordatorios del día, máximo 2 visibles */}
              {dayReminders.length > 0 && (
                <ReminderList
                  reminders={dayReminders}
                  date={date}
                  maxVisible={2}
                  onReminderClick={onReminderClick}
                  onShowMore={onShowMore}
                  focusedReminder={focusedReminder}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return generateWeekDaysHeader();
};

export default WeekView;
