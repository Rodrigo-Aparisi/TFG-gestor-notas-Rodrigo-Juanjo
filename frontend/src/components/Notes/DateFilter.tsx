import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';

interface DateFilterProps {
  notes: Note[];
  onDateFilter: (filteredNotes: Note[]) => void;
  onClearFilter: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ notes, onDateFilter, onClearFilter }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const calendarRef = useRef<HTMLDivElement>(null);

  // Hook para cerrar el calendario al hacer clic fuera
  const closeCalendar = useCallback(() => setShowCalendar(false), []);
  useClickOutside(calendarRef, closeCalendar, showCalendar);

  // Función para manejar la selección de fechas
  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Si no hay fecha inicial o ya hay un rango completo, comenzar un nuevo rango
      setStartDate(date);
      setEndDate(null);
    } else {
      // Si ya hay fecha inicial pero no final
      if (date < startDate) {
        // Si la nueva fecha es anterior a la inicial, intercambiar
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Efecto para filtrar notas cuando cambia el rango de fechas
  useEffect(() => {
    if (startDate) {
      let filtered: Note[] = [];
      
      if (endDate) {
        // Filtrar por rango de fechas
        filtered = notes.filter(note => {
          const noteDate = new Date(note.created_at);
          // Ajustar endDate para incluir todo el día final
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setHours(23, 59, 59, 999);
          
          return noteDate >= startDate && noteDate <= adjustedEndDate;
        });
        setIsFiltering(true);
        onDateFilter(filtered);
      } else {
        // Filtrar por día específico
        filtered = notes.filter(note => {
          const noteDate = new Date(note.created_at);
          return noteDate.toDateString() === startDate.toDateString();
        });
        setIsFiltering(true);
        onDateFilter(filtered);
      }
    }
  }, [startDate, endDate, notes]);

  // Función para generar los días del calendario
  const generateCalendarDays = () => {
    const days: React.ReactElement[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startingDayIndex = (firstDay.getDay() + 6) % 7; // Ajuste para que la semana comience en lunes
    const daysInMonth = lastDay.getDate();

    // Días del mes anterior
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    for (let i = 0; i < startingDayIndex; i++) {
      const day = prevMonthLastDay.getDate() - (startingDayIndex - i - 1);
      days.push(
        <div key={`prev-${i}`} className="mini-day other-month">
          {day}
        </div>
      );
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isStartDate = startDate && date.toDateString() === startDate.toDateString();
      const isEndDate = endDate && date.toDateString() === endDate.toDateString();
      const isInRange = startDate && endDate && date >= startDate && date <= endDate;
      
      days.push(
        <div
          key={`day-${day}`}
          className={`mini-day 
            ${isToday ? 'today' : ''} 
            ${isStartDate ? 'start-date' : ''}
            ${isEndDate ? 'end-date' : ''}
            ${isInRange ? 'in-range' : ''}
          `}
          onClick={() => handleDateSelect(date)}
        >
          {day}
        </div>
      );
    }

    // Días del mes siguiente para completar la cuadrícula
    const remainingCells = 42 - days.length > 7 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div key={`next-${i}`} className="mini-day other-month">
          {i}
        </div>
      );
    }

    return days;
  };

  // Función para limpiar el filtro
  const handleClearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setIsFiltering(false);
    onClearFilter();
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="date-filter-container" ref={calendarRef}>
      <button 
        className={`date-filter-button ${isFiltering ? 'active' : ''}`}
        onClick={() => setShowCalendar(!showCalendar)}
        title="Filtrar por fecha"
      >
        <i className="fas fa-calendar-alt"></i>
        {isFiltering && (
          <span className="filter-badge"></span>
        )}
      </button>
      
      {showCalendar && (
        <div className="mini-calendar-dropdown">
          <div className="mini-calendar-header">
            <button 
              className="nav-button"
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentMonth(newDate);
              }}
            >
              &lt;
            </button>
            <span>
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              className="nav-button"
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentMonth(newDate);
              }}
            >
              &gt;
            </button>
          </div>
          <div className="mini-calendar-weekdays">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="mini-weekday">{day}</div>
            ))}
          </div>
          <div className="mini-calendar-days">
            {generateCalendarDays()}
          </div>
          
          {isFiltering && (
            <div className="date-range-info">
              <span>
                {startDate && endDate 
                  ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                  : startDate 
                    ? `${formatDate(startDate)}`
                    : ''
                }
              </span>
              <button 
                className="clear-filter-btn"
                onClick={handleClearFilter}
                title="Limpiar filtro"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateFilter;
