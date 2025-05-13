import React from 'react';
import { Reminder } from '../../types';
import { hasReminders } from './ReminderUtils';

interface MiniCalendarProps {
  currentMonth: Date;
  selectedDate: Date;
  reminders: Reminder[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (newMonth: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  currentMonth,
  selectedDate,
  reminders,
  onDateSelect,
  onMonthChange,
}) => {
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
      const hasRemindersForDay = hasReminders(reminders, date);

      days.push(
        <div
          key={`day-${day}`}
          className={`mini-day 
            ${isToday ? 'today' : ''} 
            ${hasRemindersForDay ? 'has-reminders' : ''}
            ${date.toDateString() === selectedDate.toDateString() ? 'selected' : ''}
          `}
          onClick={() => onDateSelect(date)}
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

  return (
    <div className="mini-calendar-container">
      <div className="mini-calendar-header">
        <button 
          className="nav-button"
          onClick={() => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            onMonthChange(newDate);
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
            onMonthChange(newDate);
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
    </div>
  );
};

export default MiniCalendar;
