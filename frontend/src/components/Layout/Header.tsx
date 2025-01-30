import React, { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header" role="banner">
      <nav aria-label="Navegación principal">
        <Link to="/" className="logo" aria-label="Ir a la página principal">
          Gestor de Notas
        </Link>
        <div className="auth-container">
          {isAuthenticated && user ? (
            <div className="user-menu-container">
              <button 
                className="user-menu-button"
                type="button"
                aria-controls="user-dropdown"
                aria-haspopup="true"
              >
                {user.username}
              </button>
              <div className="dropdown-menu" id="user-dropdown" role="menu">
                <button 
                  onClick={() => navigate('/cuenta')}
                  role="menuitem"
                >
                  Cuenta
                </button>
                <button 
                  onClick={() => navigate('/configuracion')}
                  role="menuitem"
                >
                  Configuración
                </button>
                <button 
                  onClick={handleLogout}
                  role="menuitem"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="login-button"
              type="button"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
