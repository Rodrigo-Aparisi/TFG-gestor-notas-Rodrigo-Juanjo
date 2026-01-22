import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import "../styles/pwrecovery.css";

type FormData = {
  newPassword: string;
  confirmPassword: string;
};

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Verificar validez del token al cargar
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (token) {
          const response = await api.get(`/password/validate-token/${token}`);
          setIsValidToken(response.data.valid);
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        setIsValidToken(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    validateToken();
  }, [token]);
  
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/password/reset', {
        token,
        newPassword: data.newPassword
      });
      
      setIsSuccess(true);
      setMessage(response.data.message);
      
      // Redireccionar al login después de 3 segundos
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.' } 
        });
      }, 3000);
      
    } catch (error: unknown) {
      setIsSuccess(false);
      const apiError = error as { response?: { data?: { error?: string } } };
      setMessage(apiError.response?.data?.error || 'Error al restablecer la contraseña');
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="password-recovery-container">
        <div className="loading-indicator">Verificando enlace...</div>
      </div>
    );
  }
  
  if (!isValidToken) {
    return (
      <div className="password-recovery-container">
        <h1>Enlace inválido</h1>
        <div className="alert alert-error">
          <span>⚠</span>
          El enlace es inválido o ha expirado. Por favor solicita un nuevo enlace.
        </div>
        <button 
          onClick={() => navigate('/forgot-password')}
          className="recovery-button"
        >
          Solicitar nuevo enlace
        </button>
        
        <div className="back-to-login">
          <Link to="/login">
            <span>←</span> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="password-recovery-container">
      <h1>Crear nueva contraseña</h1>
      
      {message && (
        <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'}`}>
          {isSuccess && <span>✓</span>}
          {!isSuccess && <span>⚠</span>}
          {message}
        </div>
      )}
      
      {!isSuccess && (
        <form className="password-recovery-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Ingresa tu nueva contraseña"
              {...register('newPassword', { 
                required: 'La contraseña es requerida',
                minLength: {
                  value: 6,
                  message: 'La contraseña debe tener al menos 6 caracteres'
                }
              })}
            />
            {errors.newPassword && <span className="error">{errors.newPassword.message}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirma tu nueva contraseña"
              {...register('confirmPassword', { 
                required: 'Confirma tu contraseña',
                validate: value => value === watch('newPassword') || 'Las contraseñas no coinciden'
              })}
            />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
          </div>
          
          <button 
            type="submit" 
            className="recovery-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      )}
      
      {isSuccess && (
        <div className="loading-indicator">
          Redireccionando al inicio de sesión...
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
