import { Reminder } from '../../types';
import { formatDateForInput as formatDateForInputUtil } from '../../utils/dateFormatter';

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Use centralized utility for formatDateForInput
export const formatDateForInput = formatDateForInputUtil;

export const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
};

export const getDayReminders = (reminders: Reminder[], date: Date) => {
  return reminders.filter(reminder => {
    const reminderDate = new Date(reminder.dateTime);
    return (
      reminderDate.getDate() === date.getDate() &&
      reminderDate.getMonth() === date.getMonth() &&
      reminderDate.getFullYear() === date.getFullYear()
    );
  });
};

export const hasReminders = (reminders: Reminder[], date: Date) => {
  return reminders.some(reminder => {
    const reminderDate = new Date(reminder.dateTime);
    return (
      reminderDate.getDate() === date.getDate() &&
      reminderDate.getMonth() === date.getMonth() &&
      reminderDate.getFullYear() === date.getFullYear()
    );
  });
};
