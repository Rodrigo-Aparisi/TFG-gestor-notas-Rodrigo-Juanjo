import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FaCalendar, FaUsers, FaBars } from "react-icons/fa";
import { AiOutlineUser } from "react-icons/ai";
import { BsStickyFill } from "react-icons/bs";
import { IoCalendarOutline } from "react-icons/io5";
import WeekViewPopup from "../Reminders/WeekViewPopup";
import { getFullImageUrl } from "../../utils/imageHelpers";
import { useClickOutside } from "../../hooks/useClickOutside";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWeekView, setShowWeekView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Efecto para manejar la carga inicial y la imagen
  useEffect(() => {
    if (user?.profile_image) {
      const fullUrl = getFullImageUrl(user.profile_image);
      setProfileImage(fullUrl);
      
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
      };
      img.src = fullUrl;
    }
  }, [user?.profile_image]);

  // Hook para cerrar dropdown al hacer clic fuera
  const closeDropdown = useCallback(() => setShowDropdown(false), []);
  useClickOutside(menuContainerRef, closeDropdown, showDropdown);

  // Cerrar dropdown con Escape
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && showDropdown) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown]);

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleWeekViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWeekView(!showWeekView);
    // Si el menú móvil está abierto, cerrarlo al abrir la vista semanal
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Función para manejar el clic en el botón de hamburguesa
  const toggleMobileMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <header className="header" role="banner">
        <nav aria-label="Navegación principal">
          <div className="nav-left">
            <Link to="/" className="logo" aria-label="Ir a la página principal">
              <img 
                src="/sandalias_aladas.svg" 
                alt="Sandalias aladas" 
                className="logo-image"
              />
              <span className="logo-text">Olympus Scribe</span>
            </Link>

            {/* Botón de hamburguesa para móviles */}
            {isAuthenticated && (
              <button 
                className="mobile-menu-toggle" 
                onClick={toggleMobileMenu}
                aria-label="Abrir menú"
              >
                <FaBars />
              </button>
            )}

            {isAuthenticated && (
              <div className={`nav-icons ${mobileMenuOpen ? 'mobile-active' : ''}`}>
                <button
                  className="icon-button"
                  onClick={() => {
                    navigate("/notes");
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Ir a notas"
                >
                  <BsStickyFill size={20} />
                  <span className="icon-label">Notas</span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => {
                    navigate("/groups");
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Ir a grupos"
                >
                  <FaUsers size={20} />
                  <span className="icon-label">Grupos</span>
                </button>
                <button
                  className={`icon-button week-view-button ${showWeekView ? 'active' : ''}`}
                  onClick={(e) => {
                    handleWeekViewClick(e);
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Vista semanal"
                >
                  <IoCalendarOutline size={20} />
                  <span className="icon-label">Vista Semanal</span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => {
                    navigate("/Reminders");
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Ir a recordatorios"
                >
                  <FaCalendar />
                  <span className="icon-label">Recordatorios</span>
                </button>
              </div>
            )}
          </div>
          <div className="auth-container">
            {isAuthenticated && user ? (
              <div
                ref={menuContainerRef}
                className={`user-menu-container ${showDropdown ? "active" : ""}`}
              >
                <button
                  type="button"
                  className="user-menu-trigger"
                  onClick={handleMenuClick}
                  aria-haspopup="menu"
                  aria-expanded={showDropdown}
                  aria-label="Menú de usuario"
                  aria-controls="user-dropdown"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div className="user-menu-icon">
                    {profileImage && !imageError ? (
                      <img
                        src={profileImage}
                        alt={user?.username || 'Foto de perfil'}
                        className={`header-profile-image ${imageLoaded ? 'loaded' : ''}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                          console.error("Error cargando imagen:", profileImage);
                          setImageError(true);
                          e.currentTarget.src = "";
                        }}
                      />
                    ) : (
                      <AiOutlineUser size={24} />
                    )}
                  </div>

                  {/* Cambiar la clase user-name para que se muestre en móvil */}
                  <span className="user-name mobile-visible">{user.username}</span>
                </button>
                <div
                  className={`dropdown-menu ${showDropdown ? "show" : ""}`}
                  id="user-dropdown"
                  role="menu"
                  aria-label="Opciones de usuario"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      navigate("/settings");
                      setShowDropdown(false);
                    }}
                  >
                    Configuración
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="login-button"
                type="button"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Popup de vista semanal fuera del header pero justo debajo de él */}
      {showWeekView && (
        <div className="week-view-popup-container">
          <WeekViewPopup onClose={() => setShowWeekView(false)} />
        </div>
      )}
    </>
  );
};

export default Header;
