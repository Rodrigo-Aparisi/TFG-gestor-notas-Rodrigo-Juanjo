import React from 'react';
import { Reminder, EditingReminder } from '../../types';
import { formatDateForInput } from './ReminderUtils';
import StatusSelector from './StatusSelector';

interface ReminderDetailProps {
  focusedReminder: Reminder;
  editingReminder: EditingReminder | null;
  editingStatus: number;
  setEditingReminder: React.Dispatch<React.SetStateAction<EditingReminder | null>>;
  setEditingStatus: React.Dispatch<React.SetStateAction<number>>;
  handleSaveReminder: () => Promise<void>;
  handleDeleteReminder: (id: string) => Promise<void>;
  handleCloseReminder: () => void;
  isFromPopup: boolean;
  setIsFromPopup: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReminderDetail: React.FC<ReminderDetailProps> = ({
  focusedReminder,
  editingReminder,
  editingStatus,
  setEditingReminder,
  setEditingStatus,
  handleSaveReminder,
  handleDeleteReminder,
  handleCloseReminder,
  isFromPopup,
  setIsFromPopup
}) => {
  return (
    <div className="reminder-popup-overlay" onClick={handleCloseReminder}>
      <div 
        className={`reminder-card focused status-${focusedReminder.statusId}`}
        onClick={e => e.stopPropagation()}
      >
        {!editingReminder ? (
          // Modo visualización
          <div className="reminder-view-content">
            <h3>{focusedReminder.title}</h3>
            <div className="reminder-datetime">
              <div className="reminder-date">
                {new Date(focusedReminder.dateTime).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>
              {focusedReminder.hasTime && (
                <div className="reminder-time">
                  {new Date(focusedReminder.dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
              )}
            </div>
            <div className="reminder-description">
              {focusedReminder.description || 'Sin descripción'}
            </div>
            {/* Mostrar si tiene notificación por email */}
            <div className="reminder-notification-status">
              {(focusedReminder.emailNotification === true) ? 
                <span className="email-notification-active">Notificación por email activada</span> :
                <span className="email-notification-inactive">Sin notificación por email</span>
              }
            </div>
            <div className="reminder-popup-actions">
              <button 
                className="edit-button"
                onClick={() => {
                  setEditingStatus(focusedReminder.statusId);
                  setEditingReminder({
                    title: focusedReminder.title,
                    description: focusedReminder.description ?? '',
                    dateTime: new Date(focusedReminder.dateTime),
                    hasTime: focusedReminder.hasTime,
                    emailNotification: focusedReminder.emailNotification || focusedReminder.email_notification || false
                  });
                }}
              >
                Editar
              </button>
              <button 
                className="edit-button"
                onClick={() => handleDeleteReminder(focusedReminder.id)}
                style={{ backgroundColor: '#ff4757' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          // Modo edición
          <div className="reminder-edit-content">
            <input
              type="text"
              value={editingReminder.title}
              onChange={e => 
                setEditingReminder(prev => 
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
              placeholder="Título del recordatorio"
            />
            <textarea
              value={editingReminder.description}
              onChange={e => 
                setEditingReminder(prev => 
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
              placeholder="Descripción del recordatorio"
            />
            <div className="date-time-container">
              <input
                type="date"
                value={formatDateForInput(editingReminder.dateTime)}
                onChange={e => {
                  const newDate = new Date(e.target.value);
                  setEditingReminder(prev => {
                    if (!prev) return null;
                    const updatedDateTime = new Date(prev.dateTime);
                    updatedDateTime.setFullYear(newDate.getFullYear());
                    updatedDateTime.setMonth(newDate.getMonth());
                    updatedDateTime.setDate(newDate.getDate());
                    return { ...prev, dateTime: updatedDateTime };
                  });
                }}
              />
              <div className="time-input-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingReminder.hasTime}
                    onChange={e => 
                      setEditingReminder(prev => 
                        prev ? { ...prev, hasTime: e.target.checked } : null
                      )
                    }
                  />
                  Incluir hora
                </label>
                {editingReminder.hasTime && (
                  <input
                    type="time"
                    value={editingReminder.dateTime.toTimeString().slice(0, 5)}
                    onChange={e => {
                      const [hours, minutes] = e.target.value.split(':');
                      setEditingReminder(prev => {
                        if (!prev) return null;
                        const updatedDateTime = new Date(prev.dateTime);
                        updatedDateTime.setHours(parseInt(hours), parseInt(minutes));
                        return { ...prev, dateTime: updatedDateTime };
                      });
                    }}
                  />
                )}
              </div>
            </div>
            {/* Nuevo checkbox para notificación por email */}
            <div className="form-check email-notification-check">
              <input
                type="checkbox"
                id="editEmailNotificationCheckbox"
                checked={editingReminder.emailNotification || false}
                onChange={e => 
                  setEditingReminder(prev => 
                    prev ? { ...prev, emailNotification: e.target.checked } : null
                  )
                }
              />
              <label htmlFor="editEmailNotificationCheckbox">
                Recibir recordatorio por email
              </label>
            </div>
            <StatusSelector 
              value={editingStatus} 
              onChange={(value) => setEditingStatus(value)}
            />
            <div className="reminder-popup-actions">
              <button onClick={handleSaveReminder}>Guardar</button>
              <button onClick={() => {
                if (isFromPopup) {
                  handleCloseReminder();
                  setIsFromPopup(false);
                } else {
                  setEditingReminder(null);
                }
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderDetail;
