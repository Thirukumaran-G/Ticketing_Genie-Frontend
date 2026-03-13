// src/App.tsx
// On every page load:
//   1. Check if refresh token exists in localStorage
//   2. If yes → call POST /auth/refresh → get new access token → restore session
//   3. If no  → user must log in
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { AppRouter } from './app/routes';
import { forceLogout, updateTokens, setUser } from './features/auth/slices/authSlice';
import { injectLogout, getStoredRefreshToken, setTokens, clearTokens } from './lib/axios';
import { authService } from './features/auth/services/authService';
import { Spinner } from './components/ui';

// Wire logout → Redux + clear storage
injectLogout(() => {
  clearTokens();
  store.dispatch(forceLogout());
});

// Refresh interceptor notifies Redux when tokens rotate
(window as unknown as Record<string, unknown>).__tg_setTokens = (access: string, refresh: string) => {
  store.dispatch(updateTokens({ access, refresh }));
};

// ── Session restore on page load ──────────────────────────────────────────────
const Bootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      const rt = getStoredRefreshToken();
      if (!rt) {
        // No refresh token stored — user needs to log in
        setReady(true);
        return;
      }
      try {
        // Use stored refresh token to get a fresh access token
        const tokens = await authService.refresh(rt);
        // Store new token pair (rotated refresh token)
        setTokens(tokens.access_token, tokens.refresh_token);
        store.dispatch(updateTokens({ access: tokens.access_token, refresh: tokens.refresh_token }));
        // Fetch user profile with the new access token
        const user = await authService.me();
        store.dispatch(setUser(user));
      } catch {
        // Refresh token expired or revoked — clear everything, user logs in
        clearTokens();
        store.dispatch(forceLogout());
      } finally {
        setReady(true);
      }
    };
    restore();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => (
  <Provider store={store}>
    <Bootstrap>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a',
            borderRadius: '10px',
            fontSize: '16px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#18181b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }}
      />
    </Bootstrap>
  </Provider>
);

export default App;
