import React from 'react';

interface StatusSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="status-selector"
    >
      <option value={1}>Pendiente</option>
      <option value={2}>Completado</option>
      <option value={3}>Cancelado</option>
    </select>
  );
};

export default StatusSelector;
