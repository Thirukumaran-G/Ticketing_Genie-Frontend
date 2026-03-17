// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import { AppRouter } from './app/routes';
import { forceLogout, updateTokens, setUser } from './features/auth/slices/authSlice';
import {
  injectLogout,
  injectGetAccessToken,
  injectUpdateAccessToken,
  clearTokens,
} from './lib/axios';
import { authService } from './features/auth/services/authService';
import { Spinner } from './components/ui';

injectLogout(() => {
  clearTokens();
  store.dispatch(forceLogout());
});

injectGetAccessToken(() => store.getState().auth.accessToken);

injectUpdateAccessToken((token: string) => {
  const currentRefresh = store.getState().auth.refreshToken ?? '';
  store.dispatch(updateTokens({ access: token, refresh: currentRefresh }));
});

// ── Session restore on page load ──────────────────────────────────────────────

const Bootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);

  // ── Initial session restore ───────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const tokens = await authService.refresh();
        store.dispatch(updateTokens({
          access:  tokens.access_token,
          refresh: tokens.refresh_token,
        }));
        const user = await authService.me(tokens.access_token);
        store.dispatch(setUser(user));
      } catch {
        store.dispatch(forceLogout());
      } finally {
        setReady(true);
      }
    };
    restore();
  }, []);

  // ── Proactive token refresh every 25 min ─────────────────────────────────
  // Keeps SSE connections alive — they can't trigger axios 401 refresh.
  // Token expires in 30 min; refresh 5 min early so SSE never sees a 401.
  useEffect(() => {
    if (!ready) return;

    const REFRESH_MS = 25 * 60 * 1000;

    const tick = async () => {
      try {
        const tokens = await authService.refresh();
        store.dispatch(updateTokens({
          access:  tokens.access_token,
          refresh: tokens.refresh_token,
        }));
      } catch {
        store.dispatch(forceLogout());
      }
    };

    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [ready]);

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
            background:   '#18181b',
            color:        '#fff',
            border:       '1px solid #27272a',
            borderRadius: '10px',
            fontSize:     '16px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#18181b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }}
      />
    </Bootstrap>
  </Provider>
);

export default App;