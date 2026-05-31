/**
 * AuthContext Tests
 *
 * Tests for the authentication context provider and useAuth hook.
 * El access token vive en memoria (tokenStore), no en localStorage; al montar,
 * el provider hace un silent refresh contra la cookie si hay marcador `user`.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { tokenStore } from '../../services/tokenStore';

// El bootstrap del provider llama a authService.refreshAccessToken(); lo mockeamos
// para no hacer llamadas reales y controlar el resultado del silent refresh.
jest.mock('../../services/auth', () => ({
  authService: {
    refreshAccessToken: jest.fn(),
  },
}));
import { authService } from '../../services/auth';
const mockRefresh = authService.refreshAccessToken as jest.Mock;

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
    localStorage.clear();
    tokenStore.clear();
    mockRefresh.mockReset();
    // Por defecto, sin sesión válida en el servidor.
    mockRefresh.mockRejectedValue(new Error('no session'));
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
    // Sin marcador de sesión, no se intenta refrescar.
    expect(mockRefresh).not.toHaveBeenCalled();
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

  it('should keep the access token in memory (tokenStore), not localStorage', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));

    expect(tokenStore.get()).toBe('test-token-123');
    expect(localStorage.getItem('token')).toBeNull();
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

    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');

    await user.click(screen.getByTestId('logout-btn'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(tokenStore.get()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should update user profile', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');

    await user.click(screen.getByTestId('update-profile-btn'));

    expect(screen.getByTestId('user')).toHaveTextContent('updated-user');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
      username: 'updated-user',
    });
  });

  it('repopulates the access token via silent refresh when a user marker exists', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'user-2', username: 'saveduser', email: 'saved@example.com' })
    );
    mockRefresh.mockResolvedValue('refreshed-token');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // El marcador `user` mantiene la sesión autenticada de inmediato.
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('user')).toHaveTextContent('saveduser');

    // Tras el bootstrap, el token queda repoblado en memoria.
    expect(await screen.findByText('refreshed-token')).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears the session when the silent refresh fails', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'user-3', username: 'staleuser', email: 'stale@example.com' })
    );
    mockRefresh.mockRejectedValue(new Error('expired'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Tras fallar el refresh, la sesión se limpia.
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('no'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('user')).toBeNull();
    expect(tokenStore.get()).toBeNull();
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
