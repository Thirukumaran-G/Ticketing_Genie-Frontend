// src/features/tickets/hooks/useAgentQueue.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchAgentQueue } from '../slices/ticketsSlice';
import { ENV } from '../../../config/env';

type SSEStatus = 'connecting' | 'connected' | 'error';

export const useAgentQueue = () => {
  const dispatch    = useAppDispatch();
  const { agentQueue, isLoading } = useAppSelector((s) => s.tickets);
  const { accessToken }           = useAppSelector((s) => s.auth);
  const [sseStatus, setSseStatus] = useState<SSEStatus>('connecting');
  const sseRef = useRef<EventSource | null>(null);

  const refresh = useCallback(() => { dispatch(fetchAgentQueue()); }, [dispatch]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(`${ENV.TICKET_BASE}/agent/queue/stream?token=${accessToken}`, { withCredentials: true });
    sseRef.current = es;
    es.addEventListener('queue_update', refresh);
    es.onopen  = () => setSseStatus('connected');
    es.onerror = () => setSseStatus('error');
    return () => { es.close(); };
  }, [accessToken, refresh]);

  return { agentQueue, isLoading, sseStatus, refresh };
};
