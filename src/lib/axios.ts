// src/lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ENV } from '../config/env';

const RT_KEY = '__tg_rt__';

let _onLogout: () => void = () => { window.location.href = '/login'; };
let _getAccessToken: () => string | null = () => null;

export const setTokens = (_access: string, _refresh: string) => {
  localStorage.removeItem(RT_KEY);
};
export const setAccessToken = (_access: string) => {};
export const clearTokens = () => { localStorage.removeItem(RT_KEY); };
export const getStoredRefreshToken = (): string | null => null;
export const injectLogout = (fn: () => void) => { _onLogout = fn; };

// Called once in App.tsx to give axios access to the Redux access token
// without creating a circular import (axios → store → axios).
export const injectGetAccessToken = (fn: () => string | null) => {
  _getAccessToken = fn;
};

// ── Axios clients ─────────────────────────────────────────────────────────────

export const authClient: AxiosInstance = axios.create({
  baseURL:         ENV.AUTH_BASE,
  withCredentials: true,   // sends refresh_token httpOnly cookie automatically
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
// Access token lives in Redux memory (not a cookie).
// We inject it into every outgoing request here so all clients stay in sync.

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

// These URLs must never trigger a silent refresh — prevents infinite loops.
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
        // No body — server reads refresh_token from httpOnly cookie.
        // Server responds with new access token in body + rotates refresh cookie.
        // The updateTokens dispatch in App.tsx wires the new access token into
        // Redux so _getAccessToken() returns it on the replayed request.
        await authClient.post('/refresh', {});
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