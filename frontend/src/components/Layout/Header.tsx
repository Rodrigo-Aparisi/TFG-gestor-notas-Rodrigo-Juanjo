import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { logout } from "../../store/slices/authSlice";
import { FaCalendar } from "react-icons/fa";
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
  const [profileImage, setProfileImage] = useState<string>(user?.profile_image || "");
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Manejadores para el menú desplegable
  const handleMenuClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.getElementById("user-dropdown");
    const menuContainer = document.querySelector(".user-menu-container");
    if (
      dropdown &&
      menuContainer &&
      !menuContainer.contains(event.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

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
              </button>
              <button
                className="icon-button"
                onClick={() => navigate("/calendar")}
                aria-label="Ir a calendario"
              >
                <FaCalendar />
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
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt="Usuario"
                    className="header-profile-image"
                    onError={(e) => {
                      console.error(
                        "Error cargando imagen:",
                        user.profile_image
                      );
                      e.currentTarget.onerror = null; // Previene loop infinito
                      e.currentTarget.src = ""; // O una imagen por defecto
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
