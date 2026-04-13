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
      <label htmlFor="reminder-title" className="sr-only">Título del recordatorio</label>
      <input
        id="reminder-title"
        type="text"
        placeholder="Título del recordatorio"
        value={newReminder.title}
        onChange={e => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
      />

      <label htmlFor="reminder-description" className="sr-only">Descripción</label>
      <textarea
        id="reminder-description"
        placeholder="Descripción"
        value={newReminder.description}
        onChange={e => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
      />

      <div className="date-time-container">
        <div className="date-input">
          <label htmlFor="reminder-date" className="sr-only">Fecha del recordatorio</label>
          <input
            id="reminder-date"
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
            <>
              <label htmlFor="reminder-time" className="sr-only">Hora del recordatorio</label>
              <input
                id="reminder-time"
                type="time"
                value={newReminder.time}
                onChange={e => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
              />
            </>
          )}
        </div>
      </div>

      {/* Checkbox para notificación por email con el nuevo estilo */}
      <div className="form-check email-notification-check">
        <input
          type="checkbox"
          id="emailNotificationCheckbox"
          checked={newReminder.sendEmail || false}
          onChange={e => setNewReminder(prev => ({ 
            ...prev, 
            sendEmail: e.target.checked 
          }))}
        />
        <label htmlFor="emailNotificationCheckbox">
          Recibir recordatorio por email
        </label>
      </div>
      
      <StatusSelector value={selectedStatus} onChange={setSelectedStatus} />
      <button onClick={handleCreateReminder}>Crear Recordatorio</button>
    </div>
  );
};

export default ReminderForm;
