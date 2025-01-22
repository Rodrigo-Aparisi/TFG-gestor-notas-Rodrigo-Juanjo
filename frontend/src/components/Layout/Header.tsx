import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header">
      <nav>
        <div className="logo">Gestor de Notas</div>
        {user ? (
          <div className="user-menu">
            <span>Bienvenido, {user.username}</span>
            <button onClick={handleLogout}>Cerrar Sesión</button>
          </div>
        ) : (
          <button onClick={() => navigate('/login')}>Iniciar Sesión</button>
        )}
      </nav>
    </header>
  );
};

export default Header;
