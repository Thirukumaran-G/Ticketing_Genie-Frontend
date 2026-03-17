// src/lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ENV } from '../config/env';

const RT_KEY = '__tg_rt__';

let _onLogout: () => void = () => { window.location.href = '/login'; };
let _getAccessToken: () => string | null = () => null;
let _updateAccessToken: ((token: string) => void) | null = null;

export const setTokens = (_access: string, _refresh: string) => {
  localStorage.removeItem(RT_KEY);
};
export const setAccessToken = (_access: string) => {};
export const clearTokens = () => { localStorage.removeItem(RT_KEY); };
export const getStoredRefreshToken = (): string | null => null;
export const injectLogout = (fn: () => void) => { _onLogout = fn; };

export const injectGetAccessToken = (fn: () => string | null) => {
  _getAccessToken = fn;
};

export const injectUpdateAccessToken = (fn: (token: string) => void) => {
  _updateAccessToken = fn;
};

// ── Axios clients ─────────────────────────────────────────────────────────────

export const authClient: AxiosInstance = axios.create({
  baseURL:         ENV.AUTH_BASE,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

export const ticketClient: AxiosInstance = axios.create({
  baseURL:         ENV.TICKET_BASE,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

export const notificationClient: AxiosInstance = axios.create({
  baseURL:         ENV.NOTIFICATION_BASE,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach access token as Bearer header ────────────────

const applyAuthHeader = (instance: AxiosInstance) => {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = _getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

applyAuthHeader(authClient);
applyAuthHeader(ticketClient);
applyAuthHeader(notificationClient);

// ── Response interceptor — 401 → silent refresh → replay ─────────────────────

const SKIP_REFRESH = ['/refresh', '/login', '/logout'];
const shouldSkip = (url = '') => SKIP_REFRESH.some((u) => url.includes(u));

let isRefreshing = false;
let waitList: Array<{ ok: () => void; fail: (e: unknown) => void }> = [];

const drainQueue = (err: unknown) => {
  waitList.forEach(({ ok, fail }) => (err ? fail(err) : ok()));
  waitList = [];
};

const applyRefreshInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (
        error.response?.status !== 401 ||
        orig._retry ||
        shouldSkip(orig.url)
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitList.push({
            ok:   () => resolve(instance(orig)),
            fail: reject,
          });
        });
      }

      orig._retry  = true;
      isRefreshing = true;

      try {
        const refreshRes = await authClient.post<{ access_token: string }>('/refresh', {});
        const newToken   = refreshRes.data?.access_token;

        if (newToken) {
          // 1. Push new access token into Redux so all future requests via
          //    _getAccessToken() are correct immediately.
          if (_updateAccessToken) {
            _updateAccessToken(newToken);
          }
          // 2. Directly patch the Authorization header on every queued request's
          //    original config so replays don't wait for a React re-render cycle.
          orig.headers               = orig.headers ?? {};
          orig.headers.Authorization = `Bearer ${newToken}`;
        }

        drainQueue(null);
        return instance(orig);
      } catch (err) {
        drainQueue(err);
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
applyRefreshInterceptor(notificationClient);