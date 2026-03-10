// src/lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ENV } from '../config/env';

const RT_KEY = '__tg_rt__';

let _accessToken: string | null = null;
let _onLogout: () => void = () => { window.location.href = '/login'; };

export const setTokens = (access: string, refresh: string) => {
  _accessToken = access;
  localStorage.setItem(RT_KEY, refresh);
};

export const setAccessToken = (access: string) => {
  _accessToken = access;
};

export const clearTokens = () => {
  _accessToken = null;
  localStorage.removeItem(RT_KEY);
};

export const getStoredRefreshToken = (): string | null =>
  localStorage.getItem(RT_KEY);

export const injectLogout = (fn: () => void) => { _onLogout = fn; };

// ── Axios clients ─────────────────────────────────────────────────────────────
export const authClient: AxiosInstance = axios.create({
  baseURL: ENV.AUTH_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const ticketClient: AxiosInstance = axios.create({
  baseURL: ENV.TICKET_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const addToken = (cfg: InternalAxiosRequestConfig) => {
  if (_accessToken && cfg.headers) cfg.headers.Authorization = `Bearer ${_accessToken}`;
  return cfg;
};
authClient.interceptors.request.use(addToken);
ticketClient.interceptors.request.use(addToken);

// ── 401 → auto-refresh → replay ──────────────────────────────────────────────
let isRefreshing = false;
let waitList: Array<{ ok: (t: string) => void; fail: (e: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null) => {
  waitList.forEach(({ ok, fail }) => (err ? fail(err) : ok(token!)));
  waitList = [];
};

const applyRefreshInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const rt = getStoredRefreshToken();

      if (error.response?.status !== 401 || orig._retry || !rt) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitList.push({
            ok: (token) => {
              if (orig.headers) orig.headers.Authorization = `Bearer ${token}`;
              resolve(instance(orig));
            },
            fail: reject,
          });
        });
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        // ✅ /refresh not /auth/refresh — baseURL already includes /auth
        const { data } = await authClient.post<{
          access_token: string;
          refresh_token: string;
        }>('/refresh', { refresh_token: rt });

        setTokens(data.access_token, data.refresh_token);
        const fn = (window as unknown as Record<string, unknown>).__tg_setTokens;
        if (typeof fn === 'function') fn(data.access_token, data.refresh_token);

        drainQueue(null, data.access_token);
        if (orig.headers) orig.headers.Authorization = `Bearer ${data.access_token}`;
        return instance(orig);
      } catch (err) {
        drainQueue(err, null);
        clearTokens();
        _onLogout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    },
  );
};

applyRefreshInterceptor(authClient);
applyRefreshInterceptor(ticketClient);