import React from 'react';

interface NoteTabsProps {
  activeTab: string;
  hasSharedNotes: boolean;
  onTabChange: (tabId: string) => void;
}

const NoteTabs: React.FC<NoteTabsProps> = ({ activeTab, hasSharedNotes, onTabChange }) => {
  return (
    <div className="tabs-container">
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'my-notes' ? 'active' : ''}`} 
          onClick={() => onTabChange('my-notes')}
        >
          Mis Notas
        </div>
        <div 
          className={`tab ${activeTab === 'shared-notes' ? 'active' : ''}`} 
          onClick={() => onTabChange('shared-notes')}
        >
          Notas Compartidas
          {hasSharedNotes && <span className="notification-dot"></span>}
        </div>
      </div>
    </div>
  );
};

export default NoteTabs;
