// src/features/auth/services/authService.ts
import { authClient } from '../../../lib/axios';
import { User } from '../../../types';

export interface TokenPair {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
}

export interface RegisterData {
  full_name: string;
  email:     string;
  password:  string;
  ph_no?:    string | null;
}

export const authService = {
  login: (email: string, password: string) =>
    authClient.post<TokenPair>('/login', { email, password }).then((r) => r.data),

  register: async (data: RegisterData): Promise<TokenPair> => {
    await authClient.post('/register', data);
    return authClient
      .post<TokenPair>('/login', { email: data.email, password: data.password })
      .then((r) => r.data);
  },

  refresh: () =>
    authClient.post<TokenPair>('/refresh', {}).then((r) => r.data),

  logout: () =>
    authClient.post('/logout', {}).then((r) => r.data),

  // accessToken param — pass it explicitly right after login/refresh
  // before Redux state has been updated, so the interceptor hasn't picked it up yet
  me: (accessToken?: string) =>
    authClient
      .get<User>('/me', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      .then((r) => r.data),

  forgotPassword: (email: string) =>
    authClient.post('/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, new_password: string) =>
    authClient.post('/reset-password', { token, new_password }).then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    authClient.post('/change-password', { current_password, new_password }).then((r) => r.data),
};