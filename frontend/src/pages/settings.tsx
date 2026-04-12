import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { accountService } from "../services/accountService";
import themeService from "../services/themeService";
import { SettingsState } from "../contexts/SettingsContext";
import themeConfig from "../config/themeConfig.json";
import {
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineMail,
  AiOutlineUser,
} from "react-icons/ai";
import "../styles/settings.css";
import { getFullImageUrl } from "../utils/imageHelpers";

type ThemeType = keyof typeof themeConfig.themes;

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout: authLogout, updateUserProfile } = useAuth();
  const { updateSettings } = useSettings();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Mueve estos estados dentro del componente
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
          updateUserProfile({ profile_image: response });
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINAR") {
      showMessage("Por favor, escribe ELIMINAR para confirmar", "error");
      return;
    }

    // Solicitar la contraseña actual
    if (!userData.currentPassword) {
      showMessage("Debes introducir tu contraseña actual para eliminar la cuenta", "error");
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Pasar la contraseña actual
      await accountService.deleteUserAccount(user?.id, userData.currentPassword);
      
      showMessage("Cuenta eliminada correctamente", "success");

      // Cerrar sesión y redirigir al login
      authLogout();
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
      showMessage(error instanceof Error ? error.message : "Error al eliminar la cuenta", "error");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirmation(false);
    }
  };

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
      { key: "eliminar", label: "Eliminar cuenta" },
    ],
  };

  const [activeMainTab, setActiveMainTab] = useState<string>("cuenta");
  const [activeSubTab, setActiveSubTab] = useState<string>("informacion");
  const [expandedMenu, setExpandedMenu] = useState<string | null>("cuenta");

  const [isEditing, setIsEditing] = useState<boolean>(false);
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

  // Carga y aplica la configuración del tema desde la BBDD
  const loadTheme = useCallback(async () => {
    try {
      if (user?.id) {
        const savedTheme = localStorage.getItem("userTheme") as ThemeType;
        if (savedTheme && savedTheme in themeConfig.themes) {
          themeService.setTheme(savedTheme);
        }

        const userSettings = await accountService.getUserSettings(user.id);
        const initialTheme = (userSettings?.theme as ThemeType) || "dark";

        if (initialTheme in themeConfig.themes) {
          themeService.setTheme(initialTheme);
          localStorage.setItem("userTheme", initialTheme);
        }
      } else {
        const defaultTheme: ThemeType = "dark";
        themeService.setTheme(defaultTheme);
        localStorage.setItem("userTheme", defaultTheme);
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      const defaultTheme: ThemeType = "dark";
      themeService.setTheme(defaultTheme);
      localStorage.setItem("userTheme", defaultTheme);
    }
  }, [user]);

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
          updateSettings(parsedSettings);
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
            updateSettings(settingsToSave);
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
  }, [user, navigate, loadTheme, updateSettings]);

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
    if (type === "success") {
      toast.success(text);
    } else {
      toast.error(text);
    }
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
          authLogout();
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar los datos";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
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

              {/* Sección para eliminar la cuenta */}
              <div id="cuenta-eliminar" className="account-section delete-account-section">
                <h3>Eliminar cuenta</h3>
                <div className="delete-account-container">
                  <p className="delete-warning">
                    Al eliminar tu cuenta, se borrarán permanentemente todos tus datos, incluyendo notas, recordatorios y configuraciones personales. Esta acción no se puede deshacer.
                  </p>
                  
                  {!showDeleteConfirmation ? (
                    <button
                      type="button"
                      className="delete-account-button"
                      onClick={() => setShowDeleteConfirmation(true)}
                    >
                      Eliminar mi cuenta
                    </button>
                  ) : (
                    <div className="delete-confirmation">
                      <p>Para confirmar la eliminación de tu cuenta, escribe "ELIMINAR" en el campo a continuación:</p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Escribe ELIMINAR"
                        className="delete-confirm-input"
                      />
                      
                      <div className="password-input-container">
                        <label>Ingresa tu contraseña actual para confirmar:</label>
                        <input
                          type={showPasswords.currentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={userData.currentPassword}
                          onChange={handleChange}
                          required
                          className="delete-confirm-password"
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
                      
                      <div className="delete-buttons">
                        <button
                          type="button"
                          className="confirm-delete-button"
                          onClick={handleDeleteAccount}
                          disabled={isDeletingAccount}
                        >
                          {isDeletingAccount ? "Eliminando..." : "Confirmar eliminación"}
                        </button>
                        <button
                          type="button"
                          className="cancel-delete-button"
                          onClick={() => {
                            setShowDeleteConfirmation(false);
                            setDeleteConfirmText("");
                          }}
                          disabled={isDeletingAccount}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
            <div className="privacy-content">
              <h3>Aviso de Privacidad</h3>
              <div className="privacy-text">
                <p>
                  Al utilizar Olympus Scribe, usted acepta los siguientes términos:
                </p>
                
                <ol className="privacy-list">
                  <li>
                    <strong>Responsabilidad sobre el contenido:</strong> La Aplicación no se hace responsable por el contenido generado por la inteligencia artificial integrada.
                  </li>
                  <li>
                    <strong>Datos personales:</strong> Los datos personales y contenidos almacenados (notas, recordatorios y otra información) son responsabilidad exclusiva del usuario.
                  </li>
                  <li>
                    <strong>Recopilación de información:</strong> La Aplicación recopila únicamente la información necesaria para proporcionar sus servicios, incluyendo correo electrónico y credenciales de acceso. La información de sus notas podrá ser procesada por sistemas de IA como Ollama y Tesseract para ofrecer funcionalidades como búsqueda y organización.
                  </li>
                  <li>
                    <strong>Seguridad de la cuenta:</strong> El usuario es responsable de mantener la confidencialidad de su contraseña y cuenta.
                  </li>
                  <li>
                    <strong>Procesamiento de datos:</strong> Para ofrecer funcionalidades de IA, sus notas y consultas serán procesadas por nuestros sistemas. Estos datos se utilizan exclusivamente para mejorar su experiencia personal y no se comparten con otros usuarios ni se utilizan para entrenar modelos generales.
                  </li>
                  <li>
                    <strong>Almacenamiento de datos:</strong> Sus notas se almacenan en servidores seguros y puede solicitar la eliminación completa de su información en cualquier momento.
                  </li>
                  <li>
                    <strong>Modificaciones:</strong> Nos reservamos el derecho de modificar este aviso de privacidad en cualquier momento, notificando los cambios a través de la aplicación.
                  </li>
                  <li>
                    <strong>Aceptación:</strong> Al utilizar la Aplicación, el usuario reconoce haber leído y aceptado estos términos.
                  </li>
                </ol>
                
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Settings;
