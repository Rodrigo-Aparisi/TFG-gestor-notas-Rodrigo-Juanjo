/**
 * AuthContext Tests
 *
 * Tests for the authentication context provider and useAuth hook
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, token, isAuthenticated, setUser, setToken, logout, updateUserProfile } = useAuth();

  return (
    <div>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="token">{token || 'none'}</span>
      <button
        data-testid="login-btn"
        onClick={() => {
          setUser({ id: 'user-1', username: 'testuser', email: 'test@example.com' });
          setToken('test-token-123');
        }}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button
        data-testid="update-profile-btn"
        onClick={() => updateUserProfile({ username: 'updated-user' })}
      >
        Update Profile
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should provide default values when not authenticated', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('should update user and token when setUser and setToken are called', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(screen.getByTestId('token')).toHaveTextContent('test-token-123');
  });

  it('should persist user and token to localStorage', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));

    expect(localStorage.getItem('token')).toBe('test-token-123');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
      username: 'testuser',
    });
  });

  it('should clear user and token on logout', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');

    // Then logout
    await user.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should update user profile', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');

    // Update profile
    await user.click(screen.getByTestId('update-profile-btn'));

    expect(screen.getByTestId('user')).toHaveTextContent('updated-user');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
      username: 'updated-user',
    });
  });

  it('should restore auth state from localStorage', () => {
    // Set up localStorage before rendering
    localStorage.setItem('token', 'saved-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'user-2', username: 'saveduser', email: 'saved@example.com' })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('user')).toHaveTextContent('saveduser');
    expect(screen.getByTestId('token')).toHaveTextContent('saved-token');
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
