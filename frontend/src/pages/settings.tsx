// settings.tsx
import React, { useState } from 'react';
import '../styles/settings.css';

const Settings = () => {
  const subMenus: Record<string, { key: string; label: string }[]> = {
    general: [
      { key: 'preferencias', label: 'Preferencias' },
      { key: 'notificaciones', label: 'Notificaciones' },
    ],
    cuenta: [
      { key: 'informacion', label: 'Información de la cuenta' },
      { key: 'email', label: 'Email' },
      { key: 'contrasena', label: 'Contraseña' },
    ],
  };

  const [activeMainTab, setActiveMainTab] = useState('general');
  const [activeSubTab, setActiveSubTab] = useState('preferencias');
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const handleMainTabClick = (tab: string) => {
    if (subMenus[tab]) {
      if (expandedMenu === tab) {
        setExpandedMenu(null);
      } else {
        setExpandedMenu(tab);
        setActiveSubTab(subMenus[tab][0].key);
      }
    } else {
      setExpandedMenu(null);
    }
    setActiveMainTab(tab);
  };

  const renderContent = () => {
    if (activeMainTab === 'general') {
      switch (activeSubTab) {
        case 'preferencias':
          return <div>Contenido de Preferencias generales.</div>;
        case 'notificaciones':
          return <div>Contenido de Notificaciones generales.</div>;
        default:
          return null;
      }
    }
    if (activeMainTab === 'cuenta') {
      switch (activeSubTab) {
        case 'informacion':
          return <div>Contenido de Información de la cuenta.</div>;
        case 'email':
          return <div>Contenido de configuración de Email.</div>;
        case 'contrasena':
          return <div>Contenido de cambio de Contraseña.</div>;
        default:
          return null;
      }
    }
    if (activeMainTab === 'privacidad') {
      return <div>Contenido de configuraciones de Privacidad.</div>;
    }
    return null;
  };

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        {[
          { key: 'general', label: 'General' },
          { key: 'cuenta', label: 'Cuenta' },
          { key: 'privacidad', label: 'Privacidad' },
        ].map((item) => (
          <div key={item.key}>
            <button
              type="button"
              className={`sidebar-button ${activeMainTab === item.key ? 'active' : ''}`}
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
                    className={`submenu-button ${activeSubTab === subitem.key ? 'active' : ''}`}
                    onClick={() => setActiveSubTab(subitem.key)}
                  >
                    {subitem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="settings-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
