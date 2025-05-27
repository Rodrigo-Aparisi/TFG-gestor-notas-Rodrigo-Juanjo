import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../store";
import { accountService } from "../services/accountService";
import themeService from "../services/themeService";
import { SettingsState, updateSettings } from "../store/slices/settingsSlice";
import themeConfig from "../config/themeConfig.json";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineMail,
  AiOutlineUser,
} from "react-icons/ai";
import "../styles/settings.css";
import { logout, updateUserProfile } from "../store/slices/authSlice";

type ThemeType = keyof typeof themeConfig.themes;

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const reduxSettings = useSelector((state: RootState) => state.settings);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Función helper para construir la URL completa de la imagen
  const getFullImageUrl = (url: string | undefined): string => {
    if (!url) return "";
    const filename = url.split("/").pop();
    return `http://localhost:3001/uploads/profile-images/${filename}`;
  };

  const [profileImage, setProfileImage] = useState<string>(
    user?.profile_image ? getFullImageUrl(user.profile_image) : ""
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const formData = new FormData();
      formData.append("image", event.target.files[0]);
      try {
        setIsUploadingImage(true);
        setImageLoaded(false);
        const response = await accountService.updateUserProfileImage(formData);

        const fullUrl = getFullImageUrl(response);
        setProfileImage(fullUrl);

        if (user) {
          dispatch(updateUserProfile({ profile_image: response }));
        }

        // Precargar la imagen
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
          setImageError(false);
        };
        img.src = fullUrl;

        showMessage("Imagen de perfil actualizada correctamente", "success");
      } catch (error) {
        console.error("Error subiendo la imagen:", error);
        showMessage("Error al subir la imagen", "error");
        setImageError(true);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const [theme, setTheme] = useState<ThemeType>("dark");
  const [isSavingTheme, setIsSavingTheme] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Menú lateral y tabs
  const subMenus: Record<string, { key: string; label: string }[]> = {
    general: [
      { key: "preferencias", label: "Preferencias" },
      { key: "notificaciones", label: "Notificaciones" },
    ],
    cuenta: [
      { key: "informacion", label: "Información de la cuenta" },
      { key: "email", label: "Email" },
      { key: "contrasena", label: "Contraseña" },
    ],
  };

  const [settings, setSettings] = useState<SettingsState>({
    theme: reduxSettings?.theme || "dark",
    defaultPage: reduxSettings?.defaultPage || "notes",
    defaultNoteSort: reduxSettings?.defaultNoteSort || "date",
    confirmDelete: reduxSettings?.confirmDelete ?? true,
  });

  const [activeMainTab, setActiveMainTab] = useState<string>("cuenta");
  const [activeSubTab, setActiveSubTab] = useState<string>("informacion");
  const [expandedMenu, setExpandedMenu] = useState<string | null>("cuenta");

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [showPasswords, setShowPasswords] = useState<{
    currentPassword: boolean;
    newPassword: boolean;
    confirmNewPassword: boolean;
  }>({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const [userData, setUserData] = useState<{
    username: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }>({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Carga la configuración del tema desde la BBDD
  const loadTheme = useCallback(async () => {
    try {
      if (user?.id) {
        const savedTheme = localStorage.getItem("userTheme") as ThemeType;
        if (savedTheme && savedTheme in themeConfig.themes) {
          setTheme(savedTheme);
          themeService.setTheme(savedTheme);
        }

        const userSettings = await accountService.getUserSettings(user.id);
        const initialTheme = (userSettings?.theme as ThemeType) || "dark";

        if (initialTheme in themeConfig.themes) {
          setTheme(initialTheme);
          themeService.setTheme(initialTheme);
          localStorage.setItem("userTheme", initialTheme);
        }
      } else {
        const defaultTheme: ThemeType = "dark";
        setTheme(defaultTheme);
        themeService.setTheme(defaultTheme);
        localStorage.setItem("userTheme", defaultTheme);
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      const defaultTheme: ThemeType = "dark";
      setTheme(defaultTheme);
      themeService.setTheme(defaultTheme);
      localStorage.setItem("userTheme", defaultTheme);
    }
  }, [user]);

  const handleSettingsChange = async (
    newSettings: Partial<typeof settings>
  ) => {
    try {
      // Actualizar estado local
      setSettings((prev) => ({
        ...prev,
        ...newSettings,
      }));

      // Actualizar Redux
      dispatch(updateSettings(newSettings));

      // Guardar en localStorage
      const updatedSettings = {
        ...settings,
        ...newSettings,
      };
      localStorage.setItem("userSettings", JSON.stringify(updatedSettings));

      // Actualizar en el backend
      if (user?.id) {
        await accountService.updateUserSettings(user.id, newSettings);
      }

      showMessage("Configuración actualizada correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar la configuración:", error);
      showMessage("Error al actualizar la configuración", "error");
    }
  };

  // Efecto para manejar la imagen de perfil
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

  // Efecto para inicializar configuraciones
  useEffect(() => {
    const initializeSettings = async () => {
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        // Cargar tema
        await loadTheme();

        // Cargar configuraciones
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as SettingsState;
          setSettings(parsedSettings);
          dispatch(updateSettings(parsedSettings));
        } else if (user?.id) {
          const userSettings = await accountService.getUserSettings(user.id);
          if (userSettings) {
            const settingsToSave: SettingsState = {
              theme: userSettings.theme === "light" ? "light" : "dark",
              defaultPage: ["notes", "calendar", "home"].includes(
                userSettings.defaultPage as string
              )
                ? (userSettings.defaultPage as "notes" | "calendar" | "home")
                : "notes",
              defaultNoteSort: ["date", "title", "lastModified"].includes(
                userSettings.defaultNoteSort as string
              )
                ? (userSettings.defaultNoteSort as "date" | "title" | "lastModified")
                : "date",
              confirmDelete: Boolean(userSettings.confirmDelete),
            };
            setSettings(settingsToSave);
            dispatch(updateSettings(settingsToSave));
            localStorage.setItem(
              "userSettings",
              JSON.stringify(settingsToSave)
            );
          }
        }
        setIsLoaded(true);
      } catch (error) {
        console.error("Error initializing settings:", error);
      }
    };

    initializeSettings();
  }, [user, navigate, loadTheme, dispatch]);

  const handleMainTabClick = (tab: string) => {
    if (subMenus[tab]) {
      setExpandedMenu(expandedMenu === tab ? null : tab);
    } else {
      setExpandedMenu(null);
      scrollToSection(`${tab}-section`);
    }
    setActiveMainTab(tab);
  };

  const handleSubTabClick = (mainTab: string, subTab: string) => {
    setActiveSubTab(subTab);
    scrollToSection(`${mainTab}-${subTab}`);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!userData.currentPassword) {
        throw new Error("Debes introducir tu contraseña actual para realizar cambios");
      }

      if (
        userData.newPassword &&
        userData.newPassword !== userData.confirmNewPassword
      ) {
        throw new Error("Las contraseñas nuevas no coinciden");
      }

      const response = await accountService.updateUser(userData);

      if (response.user) {
        const requiresRelogin =
          userData.email !== user?.email || userData.newPassword;

        if (requiresRelogin) {
          showMessage(
            "Datos actualizados correctamente. Por seguridad, deberás iniciar sesión nuevamente.",
            "success"
          );
          dispatch(logout());
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 2000);
        } else {
          showMessage("Datos actualizados correctamente", "success");
          setIsEditing(false);
          setUserData((prev) => ({
            ...prev,
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
          }));
          setShowPasswords({
            currentPassword: false,
            newPassword: false,
            confirmNewPassword: false,
          });
        }
      }
    } catch (error: any) {
      showMessage(error.message || "Error al actualizar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeType) => {
    if (!user?.id) return;

    setIsSavingTheme(true);
    try {
      setTheme(newTheme);
      themeService.setTheme(newTheme);
      await accountService.updateUserSettings(user.id, { theme: newTheme });
      localStorage.setItem("userTheme", newTheme);
      showMessage("Tema actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar el tema:", error);
      showMessage("Error al actualizar el tema", "error");
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <div className="settings-page">
      {message && (
        <div className={`feedback-message ${message.type}`}>
          {message.text}
        </div>
      )}
      <div className={`settings-container ${isLoaded ? "loaded" : ""}`}>
        <div className="settings-sidebar">
          {[
            { key: "cuenta", label: "Cuenta" },
            { key: "privacidad", label: "Privacidad" },
          ].map((item) => (
            <div key={item.key}>
              <button
                type="button"
                className={`sidebar-button ${
                  activeMainTab === item.key ? "active" : ""
                } ${expandedMenu === item.key ? "" : "collapsed"} ${
                  subMenus[item.key] ? "" : "no-arrow"
                }`}
                onClick={() => handleMainTabClick(item.key)}
              >
                {item.label}
              </button>
              {expandedMenu === item.key && subMenus[item.key] && (
                <div className="submenu-container">
                  {subMenus[item.key].map((subitem) => (
                    <button
                      key={subitem.key}
                      type="button"
                      className={`submenu-button ${
                        activeSubTab === subitem.key ? "active" : ""
                      }`}
                      onClick={() => handleSubTabClick(item.key, subitem.key)}
                    >
                      {subitem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="settings-sections">
          <section id="cuenta-section">
            <h2>Cuenta</h2>
            <div className="profile-section">
              <label>Imagen de perfil</label>
              <div className="profile-image-container">
                {profileImage && !imageError ? (
                  <img
                    src={profileImage}
                    alt="Perfil"
                    className={`profile-image ${imageLoaded ? "loaded" : ""}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      console.error("Error cargando imagen:", profileImage);
                      setImageError(true);
                      e.currentTarget.src = "";
                    }}
                  />
                ) : (
                  <AiOutlineUser size={50} />
                )}
              </div>
              <div className="image-upload-container">
                <input
                  type="file"
                  id="profile-image-input"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="upload-image-button"
                  onClick={() =>
                    document.getElementById("profile-image-input")?.click()
                  }
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? "Subiendo..." : "Seleccionar imagen"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div id="cuenta-informacion" className="account-section">
                <h3>Información de la cuenta</h3>
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
              </div>

              <div id="cuenta-email" className="account-section">
                <h3>Email</h3>
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
                  {isEditing && userData.email !== user?.email && (
                    <small className="warning-text">
                      Cambiar el email requerirá volver a iniciar sesión
                    </small>
                  )}
                </div>
              </div>

              {/* Sección de Contraseña – campos deshabilitados hasta pulsar "Editar datos" */}
              <div id="cuenta-contrasena" className="account-section">
                <h3>Contraseña</h3>
                <div className="password-container">
                  {/* Contraseña actual – Ocupa toda la fila */}
                  <div className="form-group password-full">
                    <label>Contraseña actual</label>
                    <div className="password-input-container">
                      <input
                        type={showPasswords.currentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={userData.currentPassword}
                        onChange={handleChange}
                        disabled={!isEditing}
                        required
                      />
                      <span
                        className="password-toggle"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            currentPassword: !prev.currentPassword,
                          }))
                        }
                      >
                        {showPasswords.currentPassword ? (
                          <AiOutlineEyeInvisible />
                        ) : (
                          <AiOutlineEye />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Nueva contraseña – Columna izquierda */}
                  <div className="form-group password-left">
                    <label>Nueva contraseña (opcional)</label>
                    <div className="password-input-container">
                      <input
                        type={showPasswords.newPassword ? "text" : "password"}
                        name="newPassword"
                        value={userData.newPassword}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                      <span
                        className="password-toggle"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            newPassword: !prev.newPassword,
                          }))
                        }
                      >
                        {showPasswords.newPassword ? (
                          <AiOutlineEyeInvisible />
                        ) : (
                          <AiOutlineEye />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Confirmar nueva contraseña – Columna derecha */}
                  <div className="form-group password-right">
                    <label>Confirmar nueva contraseña</label>
                    <div className="password-input-container">
                      <input
                        type={
                          showPasswords.confirmNewPassword ? "text" : "password"
                        }
                        name="confirmNewPassword"
                        value={userData.confirmNewPassword}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                      <span
                        className="password-toggle"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            confirmNewPassword: !prev.confirmNewPassword,
                          }))
                        }
                      >
                        {showPasswords.confirmNewPassword ? (
                          <AiOutlineEyeInvisible />
                        ) : (
                          <AiOutlineEye />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Fin sección Contraseña */}

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
                      {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setUserData({
                          username: user?.username || "",
                          email: user?.email || "",
                          currentPassword: "",
                          newPassword: "",
                          confirmNewPassword: "",
                        });
                        setShowPasswords({
                          currentPassword: false,
                          newPassword: false,
                          confirmNewPassword: false,
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
          </section>

          {/* Sección General comentada pero mantenida para futuras implementaciones */}
           {/* <section id="general-section">
            <h2>General</h2>
           
            <div id="general-preferencias">
              <h3>Preferencias</h3>
              <div className="theme-selector">
                <h4>Apariencia</h4>
                <div className="theme-options">
                  <div
                    className={`theme-option ${theme === "dark" ? "active" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="theme-preview dark-theme">
                      <div className="preview-header"></div>
                      <div className="preview-content">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                    </div>
                    <span>Tema Oscuro</span>
                  </div>

                  <div
                    className={`theme-option ${theme === "light" ? "active" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="theme-preview light-theme">
                      <div className="preview-header"></div>
                      <div className="preview-content">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                    </div>
                    <span>Tema Claro</span>
                  </div>
                </div>
                <button
                  className="save-theme-button"
                  onClick={() => handleThemeChange(theme)}
                  disabled={isSavingTheme}
                >
                  {isSavingTheme ? "Guardando tema..." : "Guardar tema"}
                </button>
              </div>
            </div>
            <div id="general-notificaciones">
              <h3>Notificaciones</h3>
              <p>Contenido de Notificaciones generales.</p>
            </div>
          </section>
          */}

          <section id="privacidad-section">
            <h2>Privacidad</h2>
            <p>Contenido de configuraciones de Privacidad.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
