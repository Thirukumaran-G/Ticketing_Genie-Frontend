// src/features/tickets/hooks/useAgentTicket.ts
import { useEffect, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchAgentTicket, updateAgentStatusThunk } from '../slices/ticketsSlice';
import { ticketsService } from '../services/ticketsService';

export const useAgentTicket = (ticketId: string) => {
  const dispatch  = useAppDispatch();
  const { agentTicketDetail, isLoading, isSubmitting } = useAppSelector((s) => s.tickets);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (ticketId) dispatch(fetchAgentTicket(ticketId));
  }, [dispatch, ticketId]);

  const submitComment = useCallback(async () => {
    if (!commentText.trim()) return;
    await ticketsService.postComment(ticketId, commentText);
    setCommentText('');
    dispatch(fetchAgentTicket(ticketId));
  }, [dispatch, ticketId, commentText]);

  const updateStatus = useCallback((status: string, reason?: string) => {
    dispatch(updateAgentStatusThunk({ ticketId, status, reason }));
  }, [dispatch, ticketId]);

  return { ticket: agentTicketDetail, isLoading, isSubmitting, commentText, setCommentText, submitComment, updateStatus };
};
