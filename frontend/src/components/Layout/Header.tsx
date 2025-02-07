import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { FaCalendar } from 'react-icons/fa';
import { AiOutlineUser } from 'react-icons/ai';

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
        <div className="nav-left">
          <Link to="/" className="logo" aria-label="Ir a la página principal">
            Gestor de Notas
          </Link>
          {isAuthenticated && (
            <div className="nav-icons">
              <button 
                className="icon-button"
                onClick={() => navigate('/notes')}
                aria-label="Ir a notas"
              >
                <i className="fas fa-sticky-note"></i>
              </button>
              <button 
                className="icon-button"
                onClick={() => navigate('/calendar')}
                aria-label="Ir a calendario"
              >
                <FaCalendar />
              </button>
            </div>
          )}
        </div>
        <div className="auth-container">
          {isAuthenticated && user ? (
            <div className="user-menu-container" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: "0.5rem" }}>
              <div className="user-menu-icon">
                <AiOutlineUser size={24} />
              </div>
              <span className="user-name" style={{ color: "var(--dorado)", fontWeight: "bold" }}>
                {user.username}
              </span>
              <div className="dropdown-menu" id="user-dropdown" role="menu">
                <button 
                  onClick={() => navigate('/settings')}
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
