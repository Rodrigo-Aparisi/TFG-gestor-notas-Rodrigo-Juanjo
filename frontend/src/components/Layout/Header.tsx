import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/slices/authSlice";
import { FaCalendar, FaRobot } from "react-icons/fa";
import { AiOutlineUser } from "react-icons/ai";
import { BsStickyFill } from "react-icons/bs";

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

  const getFullImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `http://localhost:3001/uploads/profile-images/${filename}`;
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

  if (!isLoaded) {
    return (
      <header className="header" role="banner">
        <nav aria-label="Navegación principal">
          <div className="nav-left">
            <span className="logo">Gestor de Notas</span>
          </div>
          <div className="auth-container" style={{ visibility: "hidden" }}>
            <div className="user-menu-container">
              <div className="user-menu-icon">
                <AiOutlineUser size={24} />
              </div>
            </div>
          </div>
        </nav>
      </header>
    );
  }

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
                onClick={() => navigate("/notes")}
                aria-label="Ir a notas"
              >
                <BsStickyFill size={20} />
                <span className="icon-label">Notas</span>
              </button>
              <button
                className="icon-button"
                onClick={() => navigate("/calendar")}
                aria-label="Ir a calendario"
              >
                <FaCalendar />
                <span className="icon-label">Calendario</span>
              </button>
                <button
                  className="icon-button"
                  onClick={() => navigate("/chatbot")}
                  aria-label="Asistente IA"
                >
                  <FaRobot size={20} />
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

              <span className="user-name">{user.username}</span>
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
  );
};

export default Header;
