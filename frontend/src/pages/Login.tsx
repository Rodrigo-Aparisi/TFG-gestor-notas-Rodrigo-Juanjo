import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import { accountService } from "../services/accountService";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import "../styles/login.css";

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

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/notes", { replace: true });
    }
  }, [navigate]);

  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState<RegisterData>({
    username: "",
    email: "",
    password: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    loginPassword: false,
    registerPassword: false,
  });

  const [error, setError] = useState<string>("");

  const applyTheme = (selectedTheme: string) => {
    if (selectedTheme === "light") {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    } else {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    }
  };

  useEffect(() => {
    const wrapper = document.querySelector(".wrapper") as HTMLElement;
    const registerLink = document.querySelector(".register-link") as HTMLElement;
    const loginLink = document.querySelector(".login-link") as HTMLElement;

    if (registerLink && loginLink && wrapper) {
      registerLink.onclick = (e) => {
        e.preventDefault();
        wrapper.classList.add("active");
        setError("");
        setShowPasswords({
          loginPassword: false,
          registerPassword: false,
        });
      };

      loginLink.onclick = (e) => {
        e.preventDefault();
        wrapper.classList.remove("active");
        setError("");
        setShowPasswords({
          loginPassword: false,
          registerPassword: false,
        });
      };
    }
  }, []);

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
    setError("");

    try {
        const response = await authService.login(loginData);
        if (response && response.token && response.user) {
            // Ya no intentamos obtener ni aplicar el tema aquí
            navigate("/notes", { replace: true });
        }
    } catch (error: any) {
        console.error("Error en el login:", error);
        setError(error.message || "Error en el inicio de sesión");
    }
};


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await authService.register(registerData);
      if (response) {
        alert("Registro exitoso");
        setRegisterData({
          username: "",
          email: "",
          password: "",
        });
        const wrapper = document.querySelector(".wrapper") as HTMLElement;
        if (wrapper) {
          wrapper.classList.remove("active");
        }
      }
    } catch (error: any) {
      setError(error.message || "Error en el registro");
    }
  };

  return (
    <div className="login-container">
      <div className="wrapper">
        <span className="rotate-bg"></span>
        <span className="rotate-bg2"></span>
        
        {/* Formulario de Login */}
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
              style={{ "--i": 2, "--j": 23 } as React.CSSProperties}
            >
              <input
                type={showPasswords.loginPassword ? "text" : "password"}
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
              <label>Contraseña</label>
              <span
                className="login-password-toggle"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    loginPassword: !prev.loginPassword,
                  }))
                }
              >
                {showPasswords.loginPassword ? (
                  <AiOutlineEyeInvisible />
                ) : (
                  <AiOutlineEye />
                )}
              </span>
            </div>

            {error && (
              <div
                className="error-message animation"
                style={{ "--i": 3, "--j": 24 } as React.CSSProperties}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn animation"
              style={{ "--i": 4, "--j": 25 } as React.CSSProperties}
            >
              Iniciar Sesión
            </button>

            <div
              className="linkTxt animation"
              style={{ "--i": 5, "--j": 26 } as React.CSSProperties}
            >
              <p>
                ¿No tienes cuenta?{" "}
                <a href="#" className="register-link">
                  Regístrate
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Formulario de Registro */}
        <div className="form-box register">
          <h2
            className="title animation"
            style={{ "--i": 17, "--j": 0 } as React.CSSProperties}
          >
            Registro
          </h2>
          <form onSubmit={handleRegister}>
            <div
              className="input-box animation"
              style={{ "--i": 18, "--j": 1 } as React.CSSProperties}
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
              style={{ "--i": 19, "--j": 2 } as React.CSSProperties}
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
              style={{ "--i": 20, "--j": 3 } as React.CSSProperties}
            >
              <input
                type={showPasswords.registerPassword ? "text" : "password"}
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
              />
              <label>Contraseña</label>
              <span
                className="login-password-toggle"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    registerPassword: !prev.registerPassword,
                  }))
                }
              >
                {showPasswords.registerPassword ? (
                  <AiOutlineEyeInvisible />
                ) : (
                  <AiOutlineEye />
                )}
              </span>
            </div>

            {error && (
              <div
                className="error-message animation"
                style={{ "--i": 21, "--j": 4 } as React.CSSProperties}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn animation"
              style={{ "--i": 22, "--j": 5 } as React.CSSProperties}
            >
              Registrarse
            </button>

            <div
              className="linkTxt animation"
              style={{ "--i": 23, "--j": 6 } as React.CSSProperties}
            >
              <p>
                ¿Ya tienes cuenta?{" "}
                <a href="#" className="login-link">
                  Iniciar Sesión
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Textos informativos */}
        <div className="info-text login">
          <h2
            className="animation"
            style={{ "--i": 0, "--j": 20 } as React.CSSProperties}
          >
            ¡Bienvenido de nuevo!
          </h2>
          <p
            className="animation"
            style={{ "--i": 1, "--j": 21 } as React.CSSProperties}
          >
            Nos alegra verte otra vez.
          </p>
        </div>

        <div className="info-text register">
          <h2
            className="animation"
            style={{ "--i": 17, "--j": 0 } as React.CSSProperties}
          >
            ¡Bienvenido!
          </h2>
          <p
            className="animation"
            style={{ "--i": 18, "--j": 1 } as React.CSSProperties}
          >
            Únete a nuestra comunidad.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
