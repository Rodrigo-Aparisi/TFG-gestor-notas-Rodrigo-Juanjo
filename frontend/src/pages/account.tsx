import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { setUser, logout } from '../store/slices/authSlice';
import { accountService } from '../services/accountService';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineUser } from 'react-icons/ai';
import '../styles/account.css';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });

  const [userData, setUserData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
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

      if (userData.newPassword && userData.newPassword !== userData.confirmNewPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }

      const response = await accountService.updateUser(userData);
      
      if (response.user) {
        dispatch(setUser(response.user));
        
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
            newPassword: '',
            confirmNewPassword: ''
          }));
          setShowPasswords({
            currentPassword: false,
            newPassword: false,
            confirmNewPassword: false
          });
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
            <div className="input-container">
              <input
                type="text"
                name="username"
                value={userData.username}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
              <span className="account-icon">
                <AiOutlineUser />
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <div className="input-container">
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
              <span className="account-icon">
                <AiOutlineMail />
              </span>
            </div>
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
                <div className="password-input-container">
                  <input
                    type={showPasswords.currentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={userData.currentPassword}
                    onChange={handleChange}
                    required
                  />
                  <span 
                    className="password-toggle"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      currentPassword: !prev.currentPassword
                    }))}
                  >
                    {showPasswords.currentPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Nueva contraseña (opcional)</label>
                <div className="password-input-container">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={userData.newPassword}
                    onChange={handleChange}
                  />
                  <span 
                    className="password-toggle"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      newPassword: !prev.newPassword
                    }))}
                  >
                    {showPasswords.newPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>
                {userData.newPassword && (
                  <small className="warning-text">
                    Cambiar la contraseña requerirá volver a iniciar sesión
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Confirmar nueva contraseña</label>
                <div className="password-input-container">
                  <input
                    type={showPasswords.confirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    value={userData.confirmNewPassword}
                    onChange={handleChange}
                    required={!!userData.newPassword}
                  />
                  <span 
                    className="password-toggle"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      confirmNewPassword: !prev.confirmNewPassword
                    }))}
                  >
                    {showPasswords.confirmNewPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>
                {userData.newPassword && userData.confirmNewPassword && 
                 userData.newPassword !== userData.confirmNewPassword && (
                  <small className="warning-text">
                    Las contraseñas no coinciden
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
                      newPassword: '',
                      confirmNewPassword: ''
                    });
                    setShowPasswords({
                      currentPassword: false,
                      newPassword: false,
                      confirmNewPassword: false
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
