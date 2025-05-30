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
  isInPopup?: boolean;
}

const WeekView: React.FC<WeekViewProps> = ({
  selectedDate,
  currentMonth,
  reminders,
  focusedReminder,
  onDateSelect,
  onReminderClick,
  onShowMore,
  isInPopup = false
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
      <div className={`weekdays-header ${isInPopup ? 'in-popup' : ''}`}>
        {weekDays.map((date, index) => {
          const dayName = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'][index];
          const shortDayName = ['L', 'M', 'X', 'J', 'V', 'S', 'D'][index];
          // Obtener los recordatorios para este día
          const dayReminders = getDayReminders(reminders, date);
    
          // Ordenar los recordatorios por hora
          dayReminders.sort((a, b) => {
            const dateA = new Date(a.dateTime);
            const dateB = new Date(b.dateTime);
            return dateA.getTime() - dateB.getTime();
          });
          
          const monthShort = date.toLocaleDateString('es-ES', { month: 'short' });
    
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
                {/* Versión desktop: Todo en una línea */}
                <div className="desktop-header-format">
                  <span className="desktop-day-name">{dayName}</span>
                  <span className="desktop-day-number">{date.getDate()}</span>
                  <span className="desktop-month-name">{monthShort}</span>
                </div>
                
                {/* Versión móvil: Formato vertical */}
                <div className="mobile-header-format">
                  <span className="mobile-day-name">{shortDayName}</span>
                  <span className="mobile-day-number">{date.getDate()}</span>
                  <span className="mobile-month-name">
                    {monthShort.substring(0, 3)}
                  </span>
                </div>
              </div>
              
              <div className="weekday-reminders-wrapper">
                {dayReminders.length > 0 ? (
                  <ReminderList
                    reminders={dayReminders}
                    date={date}
                    maxVisible={2}
                    onReminderClick={onReminderClick}
                    onShowMore={onShowMore}
                    focusedReminder={focusedReminder}
                  />
                ) : (
                  <div className="no-reminders-indicator">
                    <span className="empty-day-text">Sin recordatorios</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="week-view-container">
      {generateWeekDaysHeader()}
    </div>
  );
};

export default WeekView;
