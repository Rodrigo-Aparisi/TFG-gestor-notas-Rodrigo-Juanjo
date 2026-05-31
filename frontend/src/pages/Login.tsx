import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineUser } from 'react-icons/ai';
import PasswordStrengthIndicator from '../components/Auth/PasswordStrengthIndicator';
import '../styles/login.css';

interface LocationState {
  message?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const { setToken, setUser } = useAuth();

  // Estado para el mensaje de éxito (por ejemplo, después de restablecer la contraseña)
  const [successMessage, setSuccessMessage] = useState<string | undefined>(locationState?.message);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/notes', { replace: true });
    }
  }, [navigate]);

  // Limpiar mensaje de éxito después de 5 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(undefined);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    loginPassword: false,
    registerPassword: false,
  });

  const [error, setError] = useState<string>('');
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');

  const switchToRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    setFormMode('register');
    setError('');
    setShowPasswords({ loginPassword: false, registerPassword: false });
  };

  const switchToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setFormMode('login');
    setError('');
    setShowPasswords({ loginPassword: false, registerPassword: false });
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authService.login(loginData);
      if (response && response.token && response.user) {
        // Sincronizar AuthContext (fuente de verdad) tras el login.
        setToken(response.token);
        setUser(response.user);
        toast.success(`¡Bienvenido ${response.user.username}!`, {
          duration: 3000,
          icon: '👋',
        });
        navigate('/notes', { replace: true });
      }
    } catch (error: unknown) {
      console.error('Error en el login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error en el inicio de sesión';
      toast.error(errorMessage, {
        duration: 4000,
      });
      setError(errorMessage);
    }
  };

  // Validar fortaleza de contraseña
  const validatePasswordStrength = (password: string): boolean => {
    const requirements = [
      { test: password.length >= 8, message: 'Mínimo 8 caracteres' },
      { test: /[A-Z]/.test(password), message: 'Al menos una mayúscula' },
      { test: /[a-z]/.test(password), message: 'Al menos una minúscula' },
      { test: /[0-9]/.test(password), message: 'Al menos un número' },
    ];

    const failedRequirements = requirements.filter(req => !req.test);

    if (failedRequirements.length > 0) {
      const errors = failedRequirements.map(req => req.message).join('\n');
      toast.error(`Contraseña inválida:\n${errors}`, {
        duration: 5000,
        icon: '🔒',
      });
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar fortaleza de contraseña antes de enviar
    if (!validatePasswordStrength(registerData.password)) {
      return;
    }

    try {
      const response = await authService.register(registerData);
      if (response) {
        toast.success('¡Registro exitoso! Ahora puedes iniciar sesión', {
          duration: 4000,
          icon: '✅',
        });
        setSuccessMessage('Registro exitoso');
        setRegisterData({
          username: '',
          email: '',
          password: '',
        });
        setFormMode('login');
      }
    } catch (error: unknown) {
      console.error('Error en el registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error en el registro';
      // Mostrar toast con el error
      toast.error(errorMessage, {
        duration: 5000,
      });
      setError(errorMessage);
    }
  };

  return (
    <div className="login-container">
      {/* Mostrar mensaje de éxito si existe */}
      {successMessage && (
        <div
          className="success-message animation"
          style={{ '--i': 0, '--j': 21 } as React.CSSProperties}
        >
          {successMessage}
        </div>
      )}

      <div className={`wrapper${formMode === 'register' ? ' active' : ''}`}>
        <span className="rotate-bg"></span>
        <span className="rotate-bg2"></span>

        {/* Formulario de Login */}
        <div className="form-box login">
          <h2 className="title animation" style={{ '--i': 0, '--j': 21 } as React.CSSProperties}>
            Inicio de Sesión
          </h2>

          <form onSubmit={handleLogin}>
            <div
              className="input-box animation"
              style={{ '--i': 1, '--j': 22 } as React.CSSProperties}
            >
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
              />
              <label>Email</label>
              <span className="input-icon">
                <AiOutlineMail />
              </span>
            </div>

            <div
              className="input-box animation password-field"
              style={{ '--i': 2, '--j': 23 } as React.CSSProperties}
            >
              <input
                type={showPasswords.loginPassword ? 'text' : 'password'}
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
              <label>Contraseña</label>
              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPasswords(prev => ({
                    ...prev,
                    loginPassword: !prev.loginPassword,
                  }))
                }
                aria-label={
                  showPasswords.loginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={showPasswords.loginPassword}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPasswords.loginPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>

            {error && (
              <div
                className="error-message animation"
                style={{ '--i': 3, '--j': 24 } as React.CSSProperties}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn animation"
              style={{ '--i': 4, '--j': 25 } as React.CSSProperties}
            >
              Iniciar Sesión
            </button>

            <div
              className="linkTxt animation"
              style={{ '--i': 5, '--j': 26 } as React.CSSProperties}
            >
              <p>
                ¿No tienes cuenta?{' '}
                <a href="#" className="register-link" onClick={switchToRegister}>
                  Regístrate
                </a>
              </p>
              <div className="forgot-password">
                <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
              </div>
            </div>
          </form>
        </div>

        {/* Formulario de Registro */}
        <div className="form-box register">
          <h2 className="title animation" style={{ '--i': 17, '--j': 0 } as React.CSSProperties}>
            Registro
          </h2>
          <form onSubmit={handleRegister}>
            <div
              className="input-box animation"
              style={{ '--i': 18, '--j': 1 } as React.CSSProperties}
            >
              <input
                type="text"
                name="username"
                value={registerData.username}
                onChange={handleRegisterChange}
                required
              />
              <label>Usuario</label>
              <span className="input-icon">
                <AiOutlineUser />
              </span>
            </div>

            <div
              className="input-box animation"
              style={{ '--i': 19, '--j': 2 } as React.CSSProperties}
            >
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
              />
              <label>Email</label>
              <span className="input-icon">
                <AiOutlineMail />
              </span>
            </div>

            <div
              className="input-box animation password-field"
              style={{ '--i': 20, '--j': 3 } as React.CSSProperties}
            >
              <input
                type={showPasswords.registerPassword ? 'text' : 'password'}
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
              />
              <label>Contraseña</label>
              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPasswords(prev => ({
                    ...prev,
                    registerPassword: !prev.registerPassword,
                  }))
                }
                aria-label={
                  showPasswords.registerPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={showPasswords.registerPassword}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPasswords.registerPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>

            {/* Indicador de fortaleza de contraseña */}
            <div className="animation" style={{ '--i': 21, '--j': 4 } as React.CSSProperties}>
              <PasswordStrengthIndicator
                password={registerData.password}
                show={registerData.password.length > 0}
              />
            </div>

            {error && (
              <div
                className="error-message animation"
                style={{ '--i': 21, '--j': 4 } as React.CSSProperties}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn animation"
              style={{ '--i': 22, '--j': 5 } as React.CSSProperties}
            >
              Registrarse
            </button>

            <div
              className="linkTxt animation"
              style={{ '--i': 23, '--j': 6 } as React.CSSProperties}
            >
              <p>
                ¿Ya tienes cuenta?{' '}
                <a href="#" className="login-link" onClick={switchToLogin}>
                  Iniciar Sesión
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Textos informativos */}
        <div className="info-text login">
          <h2 className="animation" style={{ '--i': 0, '--j': 20 } as React.CSSProperties}>
            ¡Bienvenido de nuevo!
          </h2>
          <p className="animation" style={{ '--i': 1, '--j': 21 } as React.CSSProperties}>
            Nos alegra verte otra vez.
          </p>
        </div>

        <div className="info-text register">
          <h2 className="animation" style={{ '--i': 17, '--j': 0 } as React.CSSProperties}>
            ¡Bienvenido!
          </h2>
          <p className="animation" style={{ '--i': 18, '--j': 1 } as React.CSSProperties}>
            Únete a nuestra comunidad.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
