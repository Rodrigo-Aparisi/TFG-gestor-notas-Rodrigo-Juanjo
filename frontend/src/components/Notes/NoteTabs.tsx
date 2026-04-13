import React, { useRef } from 'react';

interface NoteTabsProps {
  activeTab: string;
  hasSharedNotes: boolean;
  onTabChange: (tabId: string) => void;
}

const TAB_IDS = ['my-notes', 'shared-notes'];

const NoteTabs: React.FC<NoteTabsProps> = ({ activeTab, hasSharedNotes, onTabChange }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TAB_IDS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TAB_IDS.length) % TAB_IDS.length;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      onTabChange(TAB_IDS[nextIndex]);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="tabs-container">
      <div className="tabs" role="tablist" aria-label="Tipo de notas">
        <button
          ref={el => { tabRefs.current[0] = el; }}
          role="tab"
          aria-selected={activeTab === 'my-notes'}
          tabIndex={activeTab === 'my-notes' ? 0 : -1}
          className={`tab ${activeTab === 'my-notes' ? 'active' : ''}`}
          onClick={() => onTabChange('my-notes')}
          onKeyDown={e => handleKeyDown(e, 0)}
        >
          Mis Notas
        </button>
        <button
          ref={el => { tabRefs.current[1] = el; }}
          role="tab"
          aria-selected={activeTab === 'shared-notes'}
          tabIndex={activeTab === 'shared-notes' ? 0 : -1}
          className={`tab ${activeTab === 'shared-notes' ? 'active' : ''}`}
          onClick={() => onTabChange('shared-notes')}
          onKeyDown={e => handleKeyDown(e, 1)}
        >
          Notas Compartidas
          {hasSharedNotes && <span className="notification-dot"></span>}
        </button>
      </div>
    </div>
  );
};

export default NoteTabs;
