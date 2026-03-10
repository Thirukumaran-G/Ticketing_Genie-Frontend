// src/features/auth/services/authService.ts
import { authClient } from '../../../lib/axios';
import { User } from '../../../types';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  ph_no?: string | null;
}

export const authService = {
  login: (email: string, password: string) =>
    authClient.post<TokenPair>('/login', { email, password }).then((r) => r.data),

  register: (data: RegisterData) =>
    authClient.post<TokenPair>('/register', data).then((r) => r.data),

  logout: (refresh_token: string) =>
    authClient.post('/logout', { refresh_token }).then((r) => r.data),

  refresh: (refresh_token: string) =>
    authClient
      .post<{ access_token: string; refresh_token: string }>('/refresh', { refresh_token })
      .then((r) => r.data),

  me: () =>
    authClient.get<User>('/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    authClient.post('/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, new_password: string) =>
    authClient.post('/reset-password', { token, new_password }).then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    authClient.post('/change-password', { current_password, new_password }).then((r) => r.data),
};