import React from 'react';
import { Reminder } from '../../types';

interface ReminderTimeProps {
  reminder: Reminder;
}

const ReminderTime: React.FC<ReminderTimeProps> = ({ reminder }) => {
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

export default ReminderTime;
