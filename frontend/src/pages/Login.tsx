import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/style.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const wrapper = document.querySelector('.wrapper') as HTMLElement;
    const registerLink = document.querySelector('.register-link') as HTMLElement;
    const loginLink = document.querySelector('.login-link') as HTMLElement;

    if (registerLink && loginLink && wrapper) {
      registerLink.onclick = () => {
        wrapper.classList.add('active');
      };

      loginLink.onclick = () => {
        wrapper.classList.remove('active');
      };
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de login aquí
  };

  return (
    <div className="wrapper">
      <span className="rotate-bg"></span>
      <span className="rotate-bg2"></span>

      {/* Formulario de login */}
      <div className="form-box login">
        <h2
          className="title animation"
          style={{ "--i": 0, "--j": 21 } as React.CSSProperties}
        >
          Inicio de Sesión
        </h2>

        <form onSubmit={handleLogin}>
          <div
            className="input-box animation"
            style={{ "--i": 1, "--j": 22 } as React.CSSProperties}
          >
            <input type="text" id="login-username" required />
            <label htmlFor="login-username">Usuario</label>
            <i className="bx bxs-user"></i>
          </div>

          <div
            className="input-box animation"
            style={{ "--i": 2, "--j": 23 } as React.CSSProperties}
          >
            <input type="password" id="login-password" required />
            <label htmlFor="login-password">Contraseña</label>
            <i className="bx bxs-lock-alt"></i>
          </div>

          <button
            type="submit"
            className="btn animation"
            style={{ "--i": 3, "--j": 24 } as React.CSSProperties}
          >
            Inicio de Sesión  
          </button>

          <div
            className="linkTxt animation"
            style={{ "--i": 5, "--j": 25 } as React.CSSProperties}
          >
            <p>
              ¿No tienes cuenta?{" "}
              <a href="#" className="register-link">Registrate</a>
            </p>
          </div>
        </form>
      </div>

      <div className="info-text login">
        <h2
          className="animation"
          style={{ "--i": 0, "--j": 20 } as React.CSSProperties}
        >
          Bienvenido/a de vuelta!
        </h2>
        <p
          className="animation"
          style={{ "--i": 1, "--j": 21 } as React.CSSProperties}
        >
          Es un placer tenerte aquí de nuevo.
        </p>
      </div>

      {/* Formulario de Registro */}
      <div className="form-box register">
        <h2
          className="title animation"
          style={{ "--i": 17, "--j": 0 } as React.CSSProperties}
        >
          Registro
        </h2>

        <form>
          <div
            className="input-box animation"
            style={{ "--i": 18, "--j": 1 } as React.CSSProperties}
          >
            <input type="text" id="register-username" required />
            <label htmlFor="register-username">Usuario</label>
            <i className="bx bxs-user"></i>
          </div>

          <div
            className="input-box animation"
            style={{ "--i": 19, "--j": 2 } as React.CSSProperties}
          >
            <input type="email" id="register-email" required />
            <label htmlFor="register-email">Correo</label>
            <i className="bx bxs-envelope"></i>
          </div>

          <div
            className="input-box animation"
            style={{ "--i": 20, "--j": 3 } as React.CSSProperties}
          >
            <input type="password" id="register-password" required />
            <label htmlFor="register-password">Contraseña</label>
            <i className="bx bxs-lock-alt"></i>
          </div>

          <button
            type="submit"
            className="btn animation"
            style={{ "--i": 21, "--j": 4 } as React.CSSProperties}
          >
            Registro
          </button>

          <div
            className="linkTxt animation"
            style={{ "--i": 22, "--j": 5 } as React.CSSProperties}
          >
            <p>
              ¿Ya tienes cuenta?{" "}
              <a href="#" className="login-link">Iniciar Sesión</a>
            </p>
          </div>
        </form>
      </div>

      <div className="info-text register">
        <h2
          className="animation"
          style={{ "--i": 17, "--j": 0 } as React.CSSProperties}
        >
          Bienvenido/a!
        </h2>
        <p
          className="animation"
          style={{ "--i": 18, "--j": 1 } as React.CSSProperties}
        >
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </p>
      </div>
    </div>
  );
};

export default Login;
