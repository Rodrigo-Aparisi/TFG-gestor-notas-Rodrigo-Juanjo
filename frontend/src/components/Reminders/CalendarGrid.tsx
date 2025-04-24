import React from 'react';
import { Reminder } from '../../types';
import ReminderList from './ReminderList';
import { getDayReminders } from './ReminderUtils';

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date;
  reminders: Reminder[];
  focusedReminder: Reminder | null;
  onDateSelect: (date: Date) => void;
  onReminderClick: (reminder: Reminder, e: React.MouseEvent) => void;
  onShowMore: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  reminders,
  focusedReminder,
  onDateSelect,
  onReminderClick,
  onShowMore
}) => {
  const generateCalendarDays = () => {
    const days: React.ReactElement[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startingDayIndex = (firstDay.getDay() + 6) % 7; // Ajuste para que la semana empiece en lunes
    const daysInMonth = lastDay.getDate();
    
    const totalCells = 42;
  
    // Días del mes anterior
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    for (let i = 0; i < startingDayIndex; i++) {
      const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
      const dayReminders = getDayReminders(reminders, date);
      
      days.push(
        <div key={`prev-${i}`} className="day other-month">
          <div className="day-header">
            <span className="weekday-label">
              {date.toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
            <span className="day-number">{day}</span>
          </div>
          {dayReminders.length > 0 && (
            <ReminderList
              reminders={dayReminders}
              date={date}
              maxVisible={1}
              onReminderClick={onReminderClick}
              onShowMore={onShowMore}
              focusedReminder={focusedReminder}
            />
          )}
        </div>
      );
    }
  
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isCurrentDay = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const dayReminders = getDayReminders(reminders, date);
  
      days.push(
        <div
          key={`day-${day}`}
          className={`day ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => onDateSelect(date)}
        >
          <div className="day-header">
            <span className="weekday-label">
              {date.toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
            <span className="day-number">{day}</span>
          </div>
          {dayReminders.length > 0 && (
            <ReminderList
              reminders={dayReminders}
              date={date}
              maxVisible={1}
              onReminderClick={onReminderClick}
              onShowMore={onShowMore}
              focusedReminder={focusedReminder}
            />
          )}
        </div>
      );
    }
  
    // Días del mes siguiente
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
      const dayReminders = getDayReminders(reminders, nextMonthDate);
      const dayIndex = (startingDayIndex + daysInMonth + i - 1) % 7;
    
      days.push(
        <div key={`next-${i}`} className="day other-month">
          <div className="day-header">
            <span className="weekday-label">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]}
            </span>
            <span className="day-number">{i}</span>
          </div>
          {dayReminders.length > 0 && (
            <ReminderList
              reminders={dayReminders}
              date={nextMonthDate}
              maxVisible={1}
              onReminderClick={onReminderClick}
              onShowMore={onShowMore}
              focusedReminder={focusedReminder}
            />
          )}
        </div>
      );
    }
  
    return (
      <div className="calendar-days-grid">
        {days}
      </div>
    );
  };

  return (
    <div className="calendar-grid">
      {generateCalendarDays()}
    </div>
  );
};

export default CalendarGrid;
