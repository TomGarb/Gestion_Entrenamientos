import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser({ ...response.data, isAuthenticated: true });
    } catch (error) {
      console.error("Token inválido o expirado");
      logout();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      fetchUser();
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    // OAuth2PasswordRequestForm expects form-urlencoded data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    setToken(response.data.access_token);
  };

  const register = async (username, email, password) => {
    await api.post('/api/auth/register', { username, email, password });
    // Tras registrar, autologueamos
    await login(username, password);
  };

  const updateProfile = async (userData) => {
    const response = await api.put('/api/auth/me', userData);
    setUser({ ...response.data, isAuthenticated: true });
  };

  const updatePassword = async (currentPassword, newPassword) => {
    await api.put('/api/auth/me/password', { 
      current_password: currentPassword, 
      new_password: newPassword 
    });
  };

  const loginWithGoogle = async (googleToken) => {
    const response = await api.post('/api/auth/google', { token: googleToken });
    setToken(response.data.access_token);
  };

  const logout = () => {
    setToken(null);
  };

  if (loading) return null; // Wait for initial user fetch

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, updateProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
