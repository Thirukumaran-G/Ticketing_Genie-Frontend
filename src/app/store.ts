// src/app/store.ts — Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { rootReducer, RootState } from './rootReducer';
import { loggerMiddleware } from './middleware';


export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
});

export type AppDispatch = typeof store.dispatch;
export type { RootState };

// Typed hooks — always import these instead of raw useDispatch/useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useDisplayName = (): string => {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return 'User';
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
};
