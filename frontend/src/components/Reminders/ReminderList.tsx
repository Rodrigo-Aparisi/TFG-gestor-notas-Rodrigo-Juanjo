import React from 'react';
import { Reminder } from '../../types';
import ReminderCard from './ReminderCard';

interface ReminderListProps {
  reminders: Reminder[];
  date: Date;
  maxVisible: number;
  onReminderClick: (reminder: Reminder, e: React.MouseEvent) => void;
  onShowMore: (date: Date) => void;
  focusedReminder: Reminder | null;
}

const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  date,
  maxVisible,
  onReminderClick,
  onShowMore,
  focusedReminder
}) => {
  const hasMoreReminders = reminders.length > maxVisible;

  return (
    <div className="reminders-container">
      {reminders.slice(0, maxVisible).map((reminder, idx) => (
        <ReminderCard
          key={`reminder-${reminder.id}-${idx}`}
          reminder={reminder}
          onClick={onReminderClick}
          isFocused={focusedReminder?.id === reminder.id}
        />
      ))}

      {hasMoreReminders && (
        <button 
          className="show-more-reminders"
          onClick={(e) => {
            e.stopPropagation();
            onShowMore(date);
          }}
        >
          +{reminders.length - maxVisible} más
        </button>
      )}
    </div>
  );
};

export default ReminderList;
