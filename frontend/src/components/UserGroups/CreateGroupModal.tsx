import React, { useState, useEffect, useRef } from 'react';
import { CreateGroupData } from '../../types';

interface CreateGroupModalProps {
  newUserGroup: CreateGroupData;
  setUserNewGroup: React.Dispatch<React.SetStateAction<CreateGroupData>>;
  onClose: () => void;
  onCreateGroup: () => Promise<boolean>;
}

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  newUserGroup,
  setUserNewGroup,
  onClose,
  onCreateGroup
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    firstInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && (previousFocusRef.current as HTMLElement).focus) {
        (previousFocusRef.current as HTMLElement).focus();
      }
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserGroup.name.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onCreateGroup();
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-modal-title"
        ref={modalRef}
      >
        <div className="modal-header">
          <h2 id="create-group-modal-title">Crear Nuevo Grupo</h2>
          <button
            className="close-modal-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="group-name">Nombre del grupo</label>
            <input
              ref={firstInputRef}
              id="group-name"
              type="text"
              value={newUserGroup.name}
              onChange={e => setUserNewGroup({...newUserGroup, name: e.target.value})}
              placeholder="Nombre del grupo"
              required
              disabled={isSubmitting}
            />
            <label htmlFor="group-description">Descripción (opcional)</label>
            <input
              id="group-description"
              type="text"
              value={newUserGroup.description || ''}
              onChange={e => setUserNewGroup({...newUserGroup, description: e.target.value})}
              placeholder="Descripción del grupo"
              disabled={isSubmitting}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={!newUserGroup.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
