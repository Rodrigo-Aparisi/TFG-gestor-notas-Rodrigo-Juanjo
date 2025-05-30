import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/slices/authSlice";
import { FaCalendar, FaUsers, FaBars } from "react-icons/fa";
import { AiOutlineUser } from "react-icons/ai";
import { BsStickyFill } from "react-icons/bs";
import { IoCalendarOutline } from "react-icons/io5";
import { GiCaduceus } from "react-icons/gi";
import WeekViewPopup from "../Reminders/WeekViewPopup";
import config from "../../config/config";

interface User {
  id: string;
  username: string;
  profile_image?: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWeekView, setShowWeekView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getFullImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `${config.BASE_URL}${config.UPLOAD_PATH}${filename}`;
  };

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
    setIsLoaded(true);
  }, [user?.profile_image]);

  // Efecto para manejar el click fuera del dropdown
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.getElementById("user-dropdown");
    const menuContainer = document.querySelector(".user-menu-container");
    if (dropdown && menuContainer && !menuContainer.contains(event.target as Node)) {
      setShowDropdown(false);
    }
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
                  className="icon-button week-view-button"
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
                <button
                  className="icon-button"
                  onClick={() => {
                    navigate("/chatbot");
                    setMobileMenuOpen(false);
                  }}
                  aria-label="Olymp.ia"
                >
                  <GiCaduceus size={20} />
                  <span className="icon-label">Olymp.IA</span>
                </button>
              </div>
            )}
          </div>
          <div className="auth-container">
            {isAuthenticated && user ? (
              <div
                className={`user-menu-container ${showDropdown ? "active" : ""}`}
                onClick={handleMenuClick}
              >
                <div className="user-menu-icon">
                  {profileImage && !imageError ? (
                    <img
                      src={profileImage}
                      alt="Usuario"
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
                <div
                  className={`dropdown-menu ${showDropdown ? "show" : ""}`}
                  id="user-dropdown"
                  role="menu"
                >
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowDropdown(false);
                    }}
                    role="menuitem"
                  >
                    Configuración
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    role="menuitem"
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
