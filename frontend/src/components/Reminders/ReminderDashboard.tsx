// src/components/Reminders/ReminderDashboard.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Reminder } from '../../types';
import { formatDate, formatTime } from './ReminderUtils';

interface ReminderDashboardProps {
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder, e: React.MouseEvent) => void;
  selectedDate: Date;
}

const ReminderDashboard: React.FC<ReminderDashboardProps> = ({ 
  reminders, 
  onReminderClick,
  selectedDate 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visibleItems, setVisibleItems] = useState(20);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Efecto para detectar scroll y cargar más elementos
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
        // Si estamos cerca del final (a 100px del final), cargar más elementos
        if (scrollHeight - scrollTop - clientHeight < 100) {
          setVisibleItems(prev => prev + 20);
        }
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Cerrar el calendario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  const handleSort = (newSortBy: 'date' | 'title' | 'status') => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedReminders = useMemo(() => {
    // Filtrar por búsqueda, estado y fecha
    let filtered = reminders.filter(reminder => {
      const matchesSearch = searchTerm === '' || 
        reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reminder.description && reminder.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === null || reminder.statusId === filterStatus;
      
      // Filtro por fecha
      let matchesDateRange = true;
      if (startDate) {
        const reminderDate = new Date(reminder.dateTime);
        if (endDate) {
          // Ajustar endDate para incluir todo el día
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setHours(23, 59, 59, 999);
          matchesDateRange = reminderDate >= startDate && reminderDate <= adjustedEndDate;
        } else {
          // Solo filtrar por día específico
          matchesDateRange = reminderDate.toDateString() === startDate.toDateString();
        }
      }
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });

    // Ordenar según criterio seleccionado
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortDirection === 'asc' 
          ? a.dateTime.getTime() - b.dateTime.getTime()
          : b.dateTime.getTime() - a.dateTime.getTime();
      } else if (sortBy === 'title') {
        return sortDirection === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else { // status
        return sortDirection === 'asc'
          ? a.statusId - b.statusId
          : b.statusId - a.statusId;
      }
    });
  }, [reminders, searchTerm, filterStatus, sortBy, sortDirection, startDate, endDate]);

  const getSortIcon = (column: 'date' | 'title' | 'status') => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getStatusLabel = (statusId: number) => {
    switch (statusId) {
      case 1: return 'Pendiente';
      case 2: return 'Completado';
      case 3: return 'Cancelado';
      default: return 'Desconocido';
    }
  };

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

  // Función para limpiar el filtro de fecha
  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

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
        <div key={`prev-${i}`} className="rd-mini-day rd-other-month">
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
          className={`rd-mini-day 
            ${isToday ? 'rd-today' : ''} 
            ${isStartDate ? 'rd-start-date' : ''}
            ${isEndDate ? 'rd-end-date' : ''}
            ${isInRange ? 'rd-in-range' : ''}
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
        <div key={`next-${i}`} className="rd-mini-day rd-other-month">
          {i}
        </div>
      );
    }

    return days;
  };

  // Formatear fecha para mostrar
  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="reminder-dashboard">
      <div className="dashboard-header">
        {/* Contenedor de filtros - Primero el filtro de estado y luego el calendario */}
        <div className="dashboard-filter-container">
          <select 
            value={filterStatus === null ? '' : filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value === '' ? null : Number(e.target.value))}
            className="dashboard-filter"
          >
            <option value="">Todos los estados</option>
            <option value="1">Pendiente</option>
            <option value="2">Completado</option>
            <option value="3">Cancelado</option>
          </select>
          
          {/* Filtro de fecha */}
          <div className="rd-date-filter-container" ref={calendarRef}>
            <button 
              className={`rd-date-filter-button ${startDate ? 'rd-active' : ''}`}
              onClick={() => setShowCalendar(!showCalendar)}
              title="Filtrar por fecha"
            >
              <i className="fas fa-calendar-alt"></i>
              {startDate && (
                <span className="rd-filter-badge"></span>
              )}
            </button>
            
            {showCalendar && (
              <div className="rd-mini-calendar-dropdown">
                <div className="rd-mini-calendar-header">
                  <button 
                    className="rd-nav-button"
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
                    className="rd-nav-button"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentMonth(newDate);
                    }}
                  >
                    &gt;
                  </button>
                </div>
                <div className="rd-mini-calendar-weekdays">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="rd-mini-weekday">{day}</div>
                  ))}
                </div>
                <div className="rd-mini-calendar-days">
                  {generateCalendarDays()}
                </div>
                
                {startDate && (
                  <div className="rd-date-range-info">
                    <span>
                      {startDate && endDate 
                        ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                        : startDate 
                          ? `${formatShortDate(startDate)}`
                          : ''
                      }
                    </span>
                    <button 
                      className="rd-clear-filter-btn"
                      onClick={handleClearDateFilter}
                      title="Limpiar filtro"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Campo de búsqueda separado a la derecha */}
        <div className="dashboard-search-container">
          <input
            type="text"
            placeholder="Buscar recordatorios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dashboard-search"
          />
        </div>
      </div>
      
      <div className="dashboard-table-container" ref={tableRef}>
        <table className="dashboard-table">
          <thead className="sticky-header">
            <tr>
              <th onClick={() => handleSort('date')}>
                Fecha {getSortIcon('date')}
              </th>
              <th onClick={() => handleSort('title')}>
                Título {getSortIcon('title')}
              </th>
              <th onClick={() => handleSort('status')}>
                Estado {getSortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedReminders.length > 0 ? (
              filteredAndSortedReminders.slice(0, visibleItems).map((reminder) => (
                <tr 
                  key={reminder.id} 
                  onClick={(e) => onReminderClick(reminder, e)}
                  className={`dashboard-row status-${reminder.statusId}`}
                >
                  <td>
                    {formatDate(reminder.dateTime)}
                    {reminder.hasTime && (
                      <span className="dashboard-time">{formatTime(reminder.dateTime)}</span>
                    )}
                  </td>
                  <td className="dashboard-title">{reminder.title}</td>
                  <td>
                    <span className={`dashboard-status status-${reminder.statusId}`}>
                      {getStatusLabel(reminder.statusId)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="no-reminders">
                  No hay recordatorios que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReminderDashboard;
