/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '../lib/runtimeConfig';

const API_BASE = getApiBase();

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  role: 'patient' | 'doctor' | 'admin' | 'receptionist';
  doctorId?: number;
  patientId?: number;
  receptionistId?: number;
  clinicId?: number;
  clinic?: {
    id: number;
    name?: string;
    addressLine?: string;
    area?: string;
    city?: string;
    phone?: string;
    status?: string;
  } | null;
  profileImage?: string;
  emailVerifiedAt?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<VerificationResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<VerificationResponse>;
  logout: () => Promise<void>;
  updateProfile: (user: User) => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'patient' | 'doctor' | 'admin' | 'receptionist';
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bmdcRegistrationNumber?: string;
  department?: string;
  experience?: number;
}

export interface VerificationResponse {
  verificationRequired: boolean;
  email: string;
  verificationExpiresAt?: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(err);
  }
);

export { api };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const { data } = await api.get<{ success: boolean; data: { user: User } }>('/auth/profile');
        if (cancelled) return;
        if (data.success && data.data.user) {
          setState({ user: data.data.user, isAuthenticated: true, loading: false });
        } else {
          setState({ user: null, isAuthenticated: false, loading: false });
        }
      } catch {
        if (cancelled) return;
        setState({ user: null, isAuthenticated: false, loading: false });
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onLogout = () => setState({ user: null, isAuthenticated: false, loading: false });
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, []);

  const login = useCallback(async (emailOrPhone: string, password: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const payload = isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password };
    const { data } = await api.post<{ success: boolean; data: { user: User } }>('/auth/login', payload);
    if (!data.success || !data.data.user) throw new Error('Login failed');
    setState({ user: data.data.user, isAuthenticated: true, loading: false });
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    const { data } = await api.post<{ success: boolean; data: VerificationResponse }>('/auth/register', formData);
    if (!data.success || !data.data?.email) throw new Error('Registration failed');
    return data.data;
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const { data } = await api.post<{ success: boolean; data: { user: User } }>('/auth/verify-email', { email, code });
    if (!data.success || !data.data.user) throw new Error('Email verification failed');
    setState({ user: data.data.user, isAuthenticated: true, loading: false });
  }, []);

  const resendVerificationCode = useCallback(async (email: string) => {
    const { data } = await api.post<{ success: boolean; data: VerificationResponse }>('/auth/resend-verification-code', { email });
    if (!data.success || !data.data?.email) throw new Error('Resend verification code failed');
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local auth state even if the server request fails.
    }
    setState({ user: null, isAuthenticated: false, loading: false });
  }, []);

  const updateProfile = useCallback((user: User) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    verifyEmail,
    resendVerificationCode,
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
