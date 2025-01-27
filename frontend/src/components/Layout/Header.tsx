import React from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Añadido Link
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice.ts';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

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
        {user ? (
          <div className="user-menu">
            <span>Bienvenido, {user.username}</span>
            <button onClick={handleLogout} aria-label="Cerrar sesión">
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            aria-label="Iniciar sesión"
          >
            Iniciar Sesión
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
