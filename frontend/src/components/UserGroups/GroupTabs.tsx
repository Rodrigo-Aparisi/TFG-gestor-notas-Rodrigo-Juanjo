import React from 'react';

interface GroupTabsProps {
  activeTab: 'notes' | 'members';
  onTabChange: (tab: 'notes' | 'members'| 'papelera') => void;
}

const GroupTabs: React.FC<GroupTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="group-tabs">
      <div 
        className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
        onClick={() => onTabChange('notes')}
      >
        Notas
      </div>
      <div 
        className={`tab ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => onTabChange('members')}
      >
        Miembros
      </div>
    </div>
  );
};

export default GroupTabs;