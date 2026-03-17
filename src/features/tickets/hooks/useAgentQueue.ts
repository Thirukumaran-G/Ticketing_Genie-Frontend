// src/features/tickets/hooks/useAgentQueue.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchAgentQueue } from '../slices/ticketsSlice';
import { ENV } from '../../../config/env';

type SSEStatus = 'connecting' | 'connected' | 'error';

export const useAgentQueue = () => {
  const dispatch                  = useAppDispatch();
  const { agentQueue, isLoading } = useAppSelector((s) => s.tickets);
  const { accessToken }           = useAppSelector((s) => s.auth);
  const [sseStatus, setSseStatus] = useState<SSEStatus>('connecting');

  const sseRef       = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef     = useRef<string | null>(accessToken);

  // Keep tokenRef current so the reconnect closure always uses the latest token
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  const refresh = useCallback(() => { dispatch(fetchAgentQueue()); }, [dispatch]);

  useEffect(() => { refresh(); }, [refresh]);

  const connectSSE = useCallback((token: string) => {
    sseRef.current?.close();
    if (reconnectRef.current) clearTimeout(reconnectRef.current);

    const es = new EventSource(
      `${ENV.TICKET_BASE}/agent/queue/stream?token=${encodeURIComponent(token)}`,
      { withCredentials: true },
    );
    sseRef.current = es;

    es.addEventListener('queue_update', () => {
      refresh();
    });

    es.onopen  = () => setSseStatus('connected');
    es.onerror = () => {
      setSseStatus('error');
      es.close();
      // Reconnect with latest token after 5s
      reconnectRef.current = setTimeout(() => {
        const latestToken = tokenRef.current;
        if (latestToken) connectSSE(latestToken);
      }, 5_000);
    };
  }, [refresh]);

  // Connect/reconnect whenever token changes
  useEffect(() => {
    if (!accessToken) return;
    connectSSE(accessToken);
    return () => {
      sseRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [accessToken, connectSSE]);

  return { agentQueue, isLoading, sseStatus, refresh };
};