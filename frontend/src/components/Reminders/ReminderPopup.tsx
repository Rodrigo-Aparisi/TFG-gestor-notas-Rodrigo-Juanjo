import React, { useEffect, useRef } from 'react';
import { Reminder } from '../../types';

interface ReminderPopupProps {
  date: Date;
  reminders: Reminder[];
  onClose: () => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  setIsFromPopup: (value: boolean) => void;
}

const ReminderPopup: React.FC<ReminderPopupProps> = ({
  date,
  reminders,
  onClose,
  onEditReminder,
  onDeleteReminder,
  setIsFromPopup
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este recordatorio? Esta acción no se puede deshacer.')) {
      onDeleteReminder(id);
    }
  };

  // Mover foco al botón de cierre al abrir
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
  <div className="reminder-popup-overlay" onClick={onClose}>
    <div
      className="reminder-popup"
      role="dialog"
      aria-modal="true"
      aria-label="Recordatorios del día"
      onClick={e => e.stopPropagation()}
    >
      <div className="reminder-popup-header">
        <h3>{date.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })}</h3>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
        >&times;</button>
      </div>
      <div className="reminder-popup-content">
        {reminders.map((reminder, idx) => (
          <div 
            key={idx}
            className={`reminder-popup-item status-${reminder.statusId}`}
          >
            <div className="reminder-popup-details">
              <div className="reminder-popup-title">
                {reminder.title}
                {reminder.sendEmail && <span className="notification-indicator" title="Notificación por email activada"></span>}
              </div>
              <div className="reminder-popup-description">{reminder.description}</div>
              <div className="reminder-popup-footer">
                <div className="reminder-info">
                  {reminder.hasTime && (
                    <span className="reminder-time">
                      {new Date(reminder.dateTime).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                  <span className="reminder-status">
                    {reminder.statusId === 1 && "Pendiente"}
                    {reminder.statusId === 2 && "Completado"}
                    {reminder.statusId === 3 && "Cancelado"}
                  </span>
                </div>
                <div className="reminder-actions">
                  <button 
                    className="edit-button"
                    onClick={() => {
                      onEditReminder(reminder);
                      setIsFromPopup(true);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="edit-button"
                    onClick={() => handleDelete(reminder.id)}
                    style={{ backgroundColor: '#ff4757' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

export default ReminderPopup;
