import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '../../api/axios';

// Helper: a component that exposes context values and lets us call login/logout
function TestConsumer({ onRender, onLogin, onLogout }) {
  const { user, login, logout } = useAuth();
  if (onRender) onRender({ user });
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'null'}</span>
      {onLogin && <button onClick={() => login('a@b.com', 'pw')}>Login</button>}
      {onLogout && <button onClick={logout}>Logout</button>}
    </div>
  );
}

function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Initial state ─────────────────────────────────────────────────────────

  it('user is null when localStorage is empty', () => {
    renderWithAuth(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('restores user from localStorage on mount', () => {
    const stored = { _id: '1', name: 'Admin' };
    localStorage.setItem('user', JSON.stringify(stored));

    renderWithAuth(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('Admin');
  });

  it('returns null user when localStorage has malformed JSON', () => {
    localStorage.setItem('user', 'not-json{{');
    renderWithAuth(<TestConsumer />);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  // ─── login ────────────────────────────────────────────────────────────────

  it('login: calls api.post with email and password', async () => {
    const owner = { _id: '1', name: 'Owner' };
    api.post.mockResolvedValue({ data: { token: 'tok', data: { owner } } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'pw',
    });
  });

  it('login: stores token in localStorage', async () => {
    const owner = { _id: '1', name: 'Owner' };
    api.post.mockResolvedValue({ data: { token: 'jwt-123', data: { owner } } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt-123'));
  });

  it('login: stores user JSON in localStorage', async () => {
    const owner = { _id: '1', name: 'Owner' };
    api.post.mockResolvedValue({ data: { token: 'tok', data: { owner } } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(owner)
    );
  });

  it('login: updates user state from data.data.owner', async () => {
    const owner = { _id: '1', name: 'Owner' };
    api.post.mockResolvedValue({ data: { token: 'tok', data: { owner } } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('Owner')
    );
  });

  it('login: reads user from data.data.user when owner absent', async () => {
    const user = { _id: '2', name: 'User B' };
    api.post.mockResolvedValue({ data: { token: 'tok', data: { user } } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('User B')
    );
  });

  it('login: reads user from data.user as last fallback', async () => {
    const user = { _id: '3', name: 'User C' };
    api.post.mockResolvedValue({ data: { token: 'tok', user } });

    renderWithAuth(<TestConsumer onLogin />);
    await userEvent.click(screen.getByText('Login'));

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('User C')
    );
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  it('logout: clears token and user from localStorage', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ name: 'X' }));

    renderWithAuth(<TestConsumer onLogout />);
    await userEvent.click(screen.getByText('Logout'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logout: sets user to null in state', async () => {
    localStorage.setItem('user', JSON.stringify({ _id: '1', name: 'Admin' }));

    renderWithAuth(<TestConsumer onLogout />);
    expect(screen.getByTestId('user').textContent).toBe('Admin');

    await userEvent.click(screen.getByText('Logout'));

    await waitFor(() =>
      expect(screen.getByTestId('user').textContent).toBe('null')
    );
  });
});
