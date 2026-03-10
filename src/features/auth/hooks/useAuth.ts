// src/features/auth/hooks/useAuth.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { loginThunk, logoutThunk, registerThunk, clearError } from '../slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth     = useAppSelector((s) => s.auth);

  return {
    ...auth,
    login:      useCallback((email: string, password: string) =>
      dispatch(loginThunk({ email, password })), [dispatch]),
    register:   useCallback((full_name: string, email: string, password: string, ph_no?: string) =>
      dispatch(registerThunk({ 
        full_name, 
        email, 
        password, 
        ph_no: ph_no || null 
      })), [dispatch]),
    logout:     useCallback(() => dispatch(logoutThunk()), [dispatch]),
    clearError: useCallback(() => dispatch(clearError()), [dispatch]),
  };
};