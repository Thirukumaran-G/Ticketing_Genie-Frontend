// src/features/tickets/hooks/useTLQueue.ts
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchTLQueue } from '../slices/ticketsSlice';

export const useTLQueue = () => {
  const dispatch = useAppDispatch();
  const { tlQueue, isLoading } = useAppSelector((s) => s.tickets);

  const refresh = useCallback(() => { dispatch(fetchTLQueue()); }, [dispatch]);
  useEffect(() => { refresh(); }, [refresh]);

  return { tlQueue, isLoading, refresh };
};
