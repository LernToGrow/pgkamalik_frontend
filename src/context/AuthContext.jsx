import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const user = data.data?.owner || data.data?.user || data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const signup = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    const user = data.data?.owner || data.data?.user || data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
