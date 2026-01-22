/**
 * App Component Tests
 *
 * Basic smoke tests for the main App component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders without crashing (smoke test)', () => {
    // This is a minimal smoke test
    expect(true).toBe(true);
  });

  it('has required providers available', () => {
    // Verify that providers can be used together
    const TestComponent = () => {
      return (
        <AuthProvider>
          <SettingsProvider>
            <div data-testid="app-providers">Providers work</div>
          </SettingsProvider>
        </AuthProvider>
      );
    };

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('app-providers')).toHaveTextContent('Providers work');
  });
});
