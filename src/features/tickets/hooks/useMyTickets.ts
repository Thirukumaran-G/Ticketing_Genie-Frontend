// src/features/tickets/hooks/useMyTickets.ts
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchMyTickets } from '../slices/ticketsSlice';
import { CustomerTicketListItem } from '../../../types';

const OPEN_STATUSES = ['new', 'acknowledged', 'open'];

export const useMyTickets = () => {
  const dispatch = useAppDispatch();
  const { myTickets, isLoading } = useAppSelector((s) => s.tickets);
  const [filter, setFilter] = useState('all');

  useEffect(() => { dispatch(fetchMyTickets()); }, [dispatch]);

  const filtered: CustomerTicketListItem[] =
    filter === 'all'       ? myTickets :
    filter === 'open'      ? myTickets.filter((t) => OPEN_STATUSES.includes(t.status)) :
                             myTickets.filter((t) => t.status === filter);

  return { myTickets, filtered, isLoading, filter, setFilter };
};
