import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import "../styles/pwrecovery.css";
import { Link } from "react-router";

type FormData = {
  email: string;
};

const ForgotPassword: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/password/request-reset', data);
      setIsSuccess(true);
      setMessage(response.data.message);
    } catch (error: any) {
      setIsSuccess(false);
      setMessage(error.response?.data?.error || 'Error al procesar tu solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="password-recovery-container">
      <h1>Recuperar contraseña</h1>
      
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
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="Ingresa tu correo electrónico"
              {...register('email', { 
                required: 'El correo electrónico es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Correo electrónico inválido'
                }
              })}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>
          
          <button 
            type="submit" 
            className="recovery-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      )}
      
      <div className="back-to-login">
        <Link to="/login">
          <span>←</span> Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
