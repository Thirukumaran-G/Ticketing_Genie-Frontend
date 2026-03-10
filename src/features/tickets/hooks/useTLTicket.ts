// src/features/tickets/hooks/useTLTicket.ts
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchTLTicket, manualAssignThunk } from '../slices/ticketsSlice';

export const useTLTicket = (ticketId: string) => {
  const dispatch = useAppDispatch();
  const { tlTicketDetail, isLoading, isSubmitting } = useAppSelector((s) => s.tickets);

  useEffect(() => {
    if (ticketId) dispatch(fetchTLTicket(ticketId));
  }, [dispatch, ticketId]);

  const assign = useCallback((agentUserId: string) => {
    dispatch(manualAssignThunk({ ticketId, agent_user_id: agentUserId }));
  }, [dispatch, ticketId]);

  return { ticket: tlTicketDetail, isLoading, isSubmitting, assign };
};
