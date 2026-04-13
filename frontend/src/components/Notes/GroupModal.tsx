import React, { useEffect, useRef } from 'react';

interface GroupModalProps {
  isEdit?: boolean;
  group?: { id: string; name: string; color: string };
  newGroup: { name: string; color: string };
  setNewGroup: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  onClose: () => void;
  onCreateGroup: () => void;
  onUpdateGroup?: (groupId: string) => void;
}

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));

const GroupModal: React.FC<GroupModalProps> = ({
  isEdit = false,
  group,
  newGroup,
  setNewGroup,
  onClose,
  onCreateGroup,
  onUpdateGroup
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Asegurarnos de que los datos iniciales se establezcan correctamente
  useEffect(() => {
    if (isEdit && group) {
      setNewGroup({
        name: group.name,
        color: group.color
      });
    }
  }, [isEdit, group, setNewGroup]);

  useEffect(() => {
    // Guardar el elemento que tenía foco antes de abrir el modal
    previousFocusRef.current = document.activeElement;

    // Mover foco al primer campo interactivo
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
      // Restaurar el foco al elemento previo al desmontar
      if (previousFocusRef.current && (previousFocusRef.current as HTMLElement).focus) {
        (previousFocusRef.current as HTMLElement).focus();
      }
    };
  }, [onClose]);

  const handleSubmit = () => {
    onCreateGroup(); // Esta función ahora maneja tanto creación como actualización
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-modal-title"
        ref={modalRef}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="group-modal-title">{isEdit ? 'Editar grupo' : 'Crear nuevo grupo'}</h2>
        <div className="form-group">
          <label>Nombre del grupo</label>
          <input
            ref={firstInputRef}
            type="text"
            value={newGroup.name}
            onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ingrese el nombre del grupo"
          />
        </div>
        <div className="form-group">
          <label>Color del grupo</label>
          <input
            type="color"
            value={newGroup.color}
            onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
          />
        </div>
          <div className="modal-actions">
            <button onClick={onClose}>Cancelar</button>
            <button onClick={handleSubmit}>
              {isEdit ? 'Guardar cambios' : 'Crear grupo'}
            </button>
          </div>
        </div>
      </div>
  );
};

export default GroupModal;
