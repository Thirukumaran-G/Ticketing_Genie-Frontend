// src/features/auth/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../../types';
import { authService, RegisterData } from '../services/authService';
import { setTokens, clearTokens } from '../../../lib/axios';

const init: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const apiErr = (e: unknown) =>
  (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Something went wrong';

// Login: get tokens → set them in axios module → fetch /auth/me → return user
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (p: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const tokens = await authService.login(p.email, p.password);
      // Set tokens in axios BEFORE calling /auth/me so the Bearer header is sent
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authService.me();
      return { ...tokens, user };
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  },
);

// Register: updated to use full_name and ph_no
export const registerThunk = createAsyncThunk(
  'auth/register',
  async (p: RegisterData, { rejectWithValue }) => {
    try {
      const tokens = await authService.register(p);
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authService.me();
      return { ...tokens, user };
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  },
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const rt = state.auth.refreshToken;
    if (rt) await authService.logout(rt).catch(() => {});
    clearTokens();
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: init,
  reducers: {
    setUser: (s, a: PayloadAction<User>) => { s.user = a.payload; },
    clearError: (s) => { s.error = null; },
    forceLogout: (s) => {
      s.user = null; s.accessToken = null; s.refreshToken = null; s.isAuthenticated = false;
      clearTokens();
    },
    updateTokens: (s, a: PayloadAction<{ access: string; refresh: string }>) => {
      s.accessToken = a.payload.access;
      s.refreshToken = a.payload.refresh;
      s.isAuthenticated = true;
      setTokens(a.payload.access, a.payload.refresh);
    },
  },
  extraReducers: (b) => {
    // login
    b.addCase(loginThunk.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(loginThunk.fulfilled, (s, a) => {
      s.isLoading = false;
      s.accessToken = a.payload.access_token;
      s.refreshToken = a.payload.refresh_token;
      s.user = a.payload.user;
      s.isAuthenticated = true;
    });
    b.addCase(loginThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    // register
    b.addCase(registerThunk.pending, (s) => { s.isLoading = true; s.error = null; });
    b.addCase(registerThunk.fulfilled, (s, a) => {
      s.isLoading = false;
      s.accessToken = a.payload.access_token;
      s.refreshToken = a.payload.refresh_token;
      s.user = a.payload.user;
      s.isAuthenticated = true;
    });
    b.addCase(registerThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string; });

    // logout
    b.addCase(logoutThunk.fulfilled, (s) => {
      s.user = null; s.accessToken = null; s.refreshToken = null; s.isAuthenticated = false;
    });
  },
});

export const { setUser, clearError, forceLogout, updateTokens } = authSlice.actions;
export default authSlice.reducer;