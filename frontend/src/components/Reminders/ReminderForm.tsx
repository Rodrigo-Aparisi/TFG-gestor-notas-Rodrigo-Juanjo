import React from 'react';
import { NewReminder } from '../../types';
import { formatDateForInput } from './ReminderUtils';
import StatusSelector from './StatusSelector';

interface ReminderFormProps {
  newReminder: NewReminder;
  selectedDate: Date;
  selectedStatus: number;
  setNewReminder: React.Dispatch<React.SetStateAction<NewReminder>>;
  setSelectedStatus: React.Dispatch<React.SetStateAction<number>>;
  handleCreateReminder: () => Promise<void>;
  handleDateSelect: (date: Date) => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({
  newReminder,
  selectedDate,
  selectedStatus,
  setNewReminder,
  setSelectedStatus,
  handleCreateReminder,
  handleDateSelect
}) => {
  return (
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
      
      <StatusSelector value={selectedStatus} onChange={setSelectedStatus} />
      <button onClick={handleCreateReminder}>Crear Recordatorio</button>
    </div>
  );
};

export default ReminderForm;
