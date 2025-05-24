import React from 'react';
import { Reminder } from '../../types';
import ReminderTime from './ReminderTime';

interface ReminderCardProps {
  reminder: Reminder;
  onClick: (reminder: Reminder, e: React.MouseEvent) => void;
  isFocused?: boolean;
}

const ReminderCard: React.FC<ReminderCardProps> = ({ 
  reminder, 
  onClick, 
  isFocused = false 
}) => {
  // Truncar el título a un máximo de 20 caracteres
  const truncatedTitle = reminder.title.length > 20 
    ? `${reminder.title.substring(0, 20)}...` 
    : reminder.title;

  return (
    <div 
      className={`reminder-pill status-${reminder.statusId} \${
        isFocused ? 'focused' : ''
      }`}
      onClick={(e) => onClick(reminder, e)}
      title={reminder.title} // Añadir tooltip con el título completo
    >
      <ReminderTime reminder={reminder} />
      <span className="reminder-title">{truncatedTitle}</span>
    </div>
  );
};

export default ReminderCard;
