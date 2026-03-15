// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { AppRouter } from './app/routes';
import { forceLogout, updateTokens, setUser } from './features/auth/slices/authSlice';
import { injectLogout, injectGetAccessToken, clearTokens } from './lib/axios';
import { authService } from './features/auth/services/authService';
import { Spinner } from './components/ui';

// Wire logout → Redux + clear storage
injectLogout(() => {
  clearTokens();
  store.dispatch(forceLogout());
});

// Give axios request interceptor access to Redux access token
// without a circular import (axios → store → axios)
injectGetAccessToken(() => store.getState().auth.accessToken);

// ── Session restore on page load ──────────────────────────────────────────────
// Redux memory is wiped on reload but the httpOnly refresh_token cookie survives.
// We call /refresh → get new access token in response body → restore session.
const Bootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      try {
        // No body needed — browser sends refresh_token cookie automatically
        const tokens = await authService.refresh();
        store.dispatch(updateTokens({
          access:  tokens.access_token,
          refresh: tokens.refresh_token,
        }));
        // Pass token explicitly — _getAccessToken() in the interceptor may not
        // have the new token yet since Redux dispatch is async in this context
        const user = await authService.me(tokens.access_token);
        store.dispatch(setUser(user));
      } catch {
        // Refresh token missing or expired — user must log in, not an error
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
            color:      '#fff',
            border:     '1px solid #27272a',
            borderRadius: '10px',
            fontSize:   '16px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#18181b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }}
      />
    </Bootstrap>
  </Provider>
);

export default App;