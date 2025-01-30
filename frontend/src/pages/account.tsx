import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { setUser, logout } from '../store/slices/authSlice';
import { accountService } from '../services/accountService';
import '../styles/account.css';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const [userData, setUserData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userData.currentPassword) {
        throw new Error('Debes introducir tu contraseña actual para realizar cambios');
      }

      const response = await accountService.updateUser(userData);
      
      if (response.user) {
        dispatch(setUser(response.user));
        
        // Verificar si se cambió el email o la contraseña
        const requiresRelogin = 
          userData.email !== user?.email || 
          userData.newPassword;

        if (requiresRelogin) {
          showMessage('Datos actualizados correctamente. Por seguridad, deberás iniciar sesión nuevamente.', 'success');
          setTimeout(() => {
            dispatch(logout());
            navigate('/login');
          }, 2000);
        } else {
          showMessage('Datos actualizados correctamente', 'success');
          setIsEditing(false);
          setUserData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: ''
          }));
        }
      }
    } catch (error: any) {
      showMessage(error.message || 'Error al actualizar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="account-container">
      <div className="account-card">
        <h1>Mi Cuenta</h1>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre de usuario</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            {isEditing && userData.email !== user.email && (
              <small className="warning-text">
                Cambiar el email requerirá volver a iniciar sesión
              </small>
            )}
          </div>

          {isEditing && (
            <>
              <div className="form-group">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={userData.currentPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  name="newPassword"
                  value={userData.newPassword || ''}
                  onChange={handleChange}
                />
                {userData.newPassword && (
                  <small className="warning-text">
                    Cambiar la contraseña requerirá volver a iniciar sesión
                  </small>
                )}
              </div>
            </>
          )}

          <div className="button-group">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="edit-button"
              >
                Editar datos
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="save-button"
                >
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUserData({
                      username: user.username,
                      email: user.email,
                      currentPassword: '',
                      newPassword: ''
                    });
                  }}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Account;
