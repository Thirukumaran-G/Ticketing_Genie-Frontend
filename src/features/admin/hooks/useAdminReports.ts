import { useState, useEffect, useCallback } from 'react';
import { adminTicketService } from '../services/adminTicketService';

interface ReportState {
  byPriority: { priority: string; count: number }[];
  byDay:      { day: string; breach_count: number }[];
  frt:        { average_first_response_time_min: number; median_first_response_time_min: number } | null;
  byProduct:  { product_id: string; product_name: string; total: number; resolved: number; avg_resolution_time_min: number }[];
  loading:    boolean;
}

export const useAdminReports = () => {
  const [state, setState] = useState<ReportState>({
    byPriority: [],
    byDay:      [],
    frt:        null,
    byProduct:  [],
    loading:    true,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const [p, d, f, b] = await Promise.all([
        adminTicketService.reportOpenByPriority(),
        adminTicketService.reportSLABreachesByDay(),
        adminTicketService.reportFirstResponseTime(),
        adminTicketService.reportTicketsByProduct(),
      ]);
      setState({
        byPriority: p.open_tickets_by_priority,
        byDay:      d.sla_breaches_by_day,
        frt:        f,
        byProduct:  b.tickets_by_product,
        loading:    false,
      });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
};