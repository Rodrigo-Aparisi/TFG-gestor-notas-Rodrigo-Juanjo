import React, { useMemo } from 'react';

/**
 * PasswordStrengthIndicator - Componente de feedback visual para contraseñas
 *
 * Muestra en tiempo real si la contraseña cumple los requisitos de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 */

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  show = true
}) => {
  const requirements: PasswordRequirement[] = useMemo(() => [
    {
      label: 'Mínimo 8 caracteres',
      met: password.length >= 8
    },
    {
      label: 'Al menos una mayúscula (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Al menos una minúscula (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Al menos un número (0-9)',
      met: /[0-9]/.test(password)
    }
  ], [password]);

  const allMet = requirements.every(req => req.met);
  const percentMet = (requirements.filter(req => req.met).length / requirements.length) * 100;

  if (!show) return null;

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Barra de progreso */}
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: '#333',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <div style={{
          width: `${percentMet}%`,
          height: '100%',
          backgroundColor: allMet ? '#4CAF50' : '#ffc600',
          transition: 'width 0.3s ease, background-color 0.3s ease'
        }} />
      </div>

      {/* Lista de requisitos */}
      <div style={{
        fontSize: '0.875rem',
        color: '#ccc'
      }}>
        <p style={{
          marginBottom: '8px',
          fontWeight: 500,
          color: allMet ? '#4CAF50' : '#ffc600'
        }}>
          {allMet ? '✅ Contraseña válida' : '🔒 Requisitos de seguridad:'}
        </p>
        {requirements.map((req, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '6px',
              padding: '4px 0',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              marginRight: '8px',
              fontSize: '1rem',
              minWidth: '20px'
            }}>
              {req.met ? '✅' : '❌'}
            </span>
            <span style={{
              color: req.met ? '#4CAF50' : '#999',
              textDecoration: req.met ? 'none' : 'none'
            }}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {/* Mensaje adicional si falta algo */}
      {!allMet && password.length > 0 && (
        <p style={{
          marginTop: '12px',
          fontSize: '0.8rem',
          color: '#ffc600',
          fontStyle: 'italic'
        }}>
          💡 Completa todos los requisitos para registrarte
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
