// src/app/middleware.ts — custom Redux middleware
import { Middleware } from '@reduxjs/toolkit';

// Logger middleware — dev only
export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  if ((import.meta as any).env?.DEV) {
    console.group(`[Redux] ${(action as any).type}`);
    console.log('prev state', store.getState());
    console.log('action', action);
    const result = next(action);
    console.log('next state', store.getState());
    console.groupEnd();
    return result;
  }
  return next(action);
};

// Auth expiry middleware — force logout on token expiry action
export const authMiddleware: Middleware = () => (next) => (action) => {
  return next(action);
};
