/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'token';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  role: 'patient' | 'doctor' | 'admin';
  doctorId?: number;
  patientId?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (user: User) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'patient' | 'doctor' | 'admin';
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bmdcRegistrationNumber?: string;
  department?: string;
  experience?: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(err);
  }
);

export { api };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setState((s) => ({ ...s, user: null, loading: false }));
        return;
      }
      try {
        const { data } = await api.get<{ success: boolean; data: { user: User } }>('/auth/profile');
        if (cancelled) return;
        if (data.success && data.data.user) {
          setState((s) => ({ ...s, user: data.data.user, token, loading: false }));
        } else {
          setState((s) => ({ ...s, user: null, token: null, loading: false }));
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, user: null, token: null, loading: false }));
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onLogout = () => setState((s) => ({ ...s, user: null, token: null }));
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const payload = isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password };
    const { data } = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', payload);
    if (!data.success || !data.data.token) throw new Error('Login failed');
    localStorage.setItem(TOKEN_KEY, data.data.token);
    setState({ user: data.data.user, token: data.data.token, loading: false });
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    const { data } = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', formData);
    if (!data.success || !data.data.token) throw new Error('Registration failed');
    localStorage.setItem(TOKEN_KEY, data.data.token);
    setState({ user: data.data.user, token: data.data.token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const updateProfile = useCallback((user: User) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
