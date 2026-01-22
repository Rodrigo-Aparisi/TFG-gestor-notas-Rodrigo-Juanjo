/**
 * SettingsContext Tests
 *
 * Tests for the settings context provider and useSettings hook
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider, useSettings, SettingsState } from '../SettingsContext';

// Test component that uses the settings context
const TestComponent: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div>
      <span data-testid="theme">{settings.theme}</span>
      <span data-testid="defaultNoteSort">{settings.defaultNoteSort}</span>
      <span data-testid="defaultPage">{settings.defaultPage}</span>
      <span data-testid="confirmDelete">{settings.confirmDelete ? 'yes' : 'no'}</span>
      <button
        data-testid="change-theme-btn"
        onClick={() => updateSettings({ theme: 'light' })}
      >
        Change Theme
      </button>
      <button
        data-testid="change-sort-btn"
        onClick={() => updateSettings({ defaultNoteSort: 'title' })}
      >
        Change Sort
      </button>
      <button
        data-testid="change-page-btn"
        onClick={() => updateSettings({ defaultPage: 'calendar' })}
      >
        Change Page
      </button>
      <button
        data-testid="toggle-confirm-btn"
        onClick={() => updateSettings({ confirmDelete: false })}
      >
        Toggle Confirm
      </button>
      <button
        data-testid="reset-btn"
        onClick={resetSettings}
      >
        Reset
      </button>
      <button
        data-testid="update-multiple-btn"
        onClick={() => updateSettings({ theme: 'light', defaultNoteSort: 'lastModified' })}
      >
        Update Multiple
      </button>
    </div>
  );
};

describe('SettingsContext', () => {
  it('should provide default settings values', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('date');
    expect(screen.getByTestId('defaultPage')).toHaveTextContent('notes');
    expect(screen.getByTestId('confirmDelete')).toHaveTextContent('yes');
  });

  it('should update theme setting', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    await user.click(screen.getByTestId('change-theme-btn'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('should update defaultNoteSort setting', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('date');

    await user.click(screen.getByTestId('change-sort-btn'));

    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('title');
  });

  it('should update defaultPage setting', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('defaultPage')).toHaveTextContent('notes');

    await user.click(screen.getByTestId('change-page-btn'));

    expect(screen.getByTestId('defaultPage')).toHaveTextContent('calendar');
  });

  it('should update confirmDelete setting', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('confirmDelete')).toHaveTextContent('yes');

    await user.click(screen.getByTestId('toggle-confirm-btn'));

    expect(screen.getByTestId('confirmDelete')).toHaveTextContent('no');
  });

  it('should update multiple settings at once', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('date');

    await user.click(screen.getByTestId('update-multiple-btn'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('lastModified');
  });

  it('should reset settings to defaults', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    // Change some settings first
    await user.click(screen.getByTestId('change-theme-btn'));
    await user.click(screen.getByTestId('change-sort-btn'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('title');

    // Reset
    await user.click(screen.getByTestId('reset-btn'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('date');
    expect(screen.getByTestId('defaultPage')).toHaveTextContent('notes');
    expect(screen.getByTestId('confirmDelete')).toHaveTextContent('yes');
  });

  it('should preserve unchanged settings when updating', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    // Change only theme
    await user.click(screen.getByTestId('change-theme-btn'));

    // Other settings should remain unchanged
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('defaultNoteSort')).toHaveTextContent('date');
    expect(screen.getByTestId('defaultPage')).toHaveTextContent('notes');
    expect(screen.getByTestId('confirmDelete')).toHaveTextContent('yes');
  });

  it('should throw error when useSettings is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSettings must be used within a SettingsProvider');

    consoleSpy.mockRestore();
  });
});
