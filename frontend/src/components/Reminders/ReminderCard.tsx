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
  return (
    <div 
      className={`reminder-pill status-${reminder.statusId} ${
        isFocused ? 'focused' : ''
      }`}
      onClick={(e) => onClick(reminder, e)}
    >
      <ReminderTime reminder={reminder} />
      <span className="reminder-title">{reminder.title}</span>
      {isFocused && (
        <div className="reminder-description">
          {reminder.description}
        </div>
      )}
    </div>
  );
};

export default ReminderCard;
