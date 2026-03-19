// src/features/auth/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../../types';
import { authService, RegisterData } from '../services/authService';
import { setTokens, clearTokens } from '../../../lib/axios';

const init: AuthState = {
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,
  isLoading:       false,
  isInitialising:  true,
  error:           null,
};

// ── Error extractor ───────────────────────────────────────────────────────────
// Surfaces the most specific human-readable message available:
//   1. VALIDATION_ERROR details array  → first field message (exact Pydantic text)
//   2. data.detail                     → FastAPI default string
//   3. data.message                    → our AppException message
//   4. Generic fallback
const apiErr = (e: unknown): string => {
  const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return 'Something went wrong. Please try again.';

  if (
    data.error_code === 'VALIDATION_ERROR' &&
    Array.isArray(data.details) &&
    data.details.length > 0
  ) {
    const first = data.details[0] as Record<string, unknown>;
    const msg   = typeof first.message === 'string' ? first.message : '';
    if (msg) return msg;
  }

  if (typeof data.detail  === 'string' && data.detail)  return data.detail;
  if (typeof data.message === 'string' && data.message) return data.message;

  return 'Something went wrong. Please try again.';
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (p: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const tokens = await authService.login(p.email, p.password);
      const user   = await authService.me(tokens.access_token);
      setTokens(tokens.access_token, tokens.refresh_token);
      return { ...tokens, user };
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  },
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (p: RegisterData, { rejectWithValue }) => {
    try {
      const tokens = await authService.register(p);
      const user   = await authService.me(tokens.access_token);
      setTokens(tokens.access_token, tokens.refresh_token);
      return { ...tokens, user };
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  },
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async () => {
    try { await authService.logout(); } catch {}
    clearTokens();
  },
);

const authSlice = createSlice({
  name:         'auth',
  initialState: init,
  reducers: {
    setUser:     (s, a: PayloadAction<User>) => { s.user = a.payload; },
    clearError:  (s) => { s.error = null; },
    forceLogout: (s) => {
      s.user            = null;
      s.accessToken     = null;
      s.refreshToken    = null;
      s.isAuthenticated = false;
      s.isInitialising  = false;
      clearTokens();
    },
    updateTokens: (s, a: PayloadAction<{ access: string; refresh: string }>) => {
      s.accessToken     = a.payload.access;
      s.refreshToken    = a.payload.refresh;
      s.isAuthenticated = true;
      setTokens(a.payload.access, a.payload.refresh);
    },
  },
  extraReducers: (b) => {
    b.addCase(loginThunk.pending,   (s) => { s.isLoading = true;  s.error = null; });
    b.addCase(loginThunk.fulfilled, (s, a) => {
      s.isLoading       = false;
      s.accessToken     = a.payload.access_token;
      s.refreshToken    = a.payload.refresh_token;
      s.user            = a.payload.user;
      s.isAuthenticated = true;
      s.isInitialising  = false;
    });
    b.addCase(loginThunk.rejected, (s, a) => {
      s.isLoading = false;
      s.error     = a.payload as string;
    });

    b.addCase(registerThunk.pending,   (s) => { s.isLoading = true;  s.error = null; });
    b.addCase(registerThunk.fulfilled, (s, a) => {
      s.isLoading       = false;
      s.accessToken     = a.payload.access_token;
      s.refreshToken    = a.payload.refresh_token;
      s.user            = a.payload.user;
      s.isAuthenticated = true;
      s.isInitialising  = false;
    });
    b.addCase(registerThunk.rejected, (s, a) => {
      s.isLoading = false;
      s.error     = a.payload as string;
    });

    b.addCase(logoutThunk.fulfilled, (s) => {
      s.user            = null;
      s.accessToken     = null;
      s.refreshToken    = null;
      s.isAuthenticated = false;
    });
  },
});

export const { setUser, clearError, forceLogout, updateTokens } = authSlice.actions;
export default authSlice.reducer;