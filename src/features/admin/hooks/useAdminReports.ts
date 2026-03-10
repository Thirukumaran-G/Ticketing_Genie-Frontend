// src/features/admin/hooks/useAdminReports.ts
import { useEffect, useState, useCallback } from 'react';
import { adminTicketService } from '../services/adminTicketService';

export const useAdminReports = () => {
  const [byPriority, setByPriority] = useState<Record<string, number> | null>(null);
  const [byDay, setByDay]           = useState<Record<string, number> | null>(null);
  const [frt, setFrt]               = useState<{ avg_minutes: number; median_minutes: number } | null>(null);
  const [byProduct, setByProduct]   = useState<Record<string, number> | null>(null);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminTicketService.reportOpenByPriority(),
      adminTicketService.reportSLABreachesByDay(),
      adminTicketService.reportFirstResponseTime(),
      adminTicketService.reportTicketsByProduct(),
    ]).then(([p, d, f, pr]) => {
      setByPriority(p as any); setByDay(d as any); setFrt(f); setByProduct(pr as any);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { byPriority, byDay, frt, byProduct, loading, refresh: load };
};
