// src/features/admin/hooks/useAdminTeams.ts
import { useEffect, useState, useCallback } from 'react';
import { adminTicketService } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { TeamResponse, AdminUserResponse } from '../../../types';

export const useAdminTeams = () => {
  const [teams, setTeams]       = useState<TeamResponse[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers]       = useState<AdminUserResponse[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() =>
    adminTicketService.listTeams().then(setTeams).finally(() => setLoading(false)), []);

  useEffect(() => {
    load();
    adminTicketService.listProducts().then(setProducts);
    adminAuthService.listUsers().then(setUsers);
  }, [load]);

  const createTeam = useCallback(async (d: { name: string; product_id: string; team_lead_id?: string }) => {
    await adminTicketService.createTeam(d);
    load();
  }, [load]);

  const deactivateTeam = useCallback(async (teamId: string) => {
    await adminTicketService.deactivateTeam(teamId);
    load();
  }, [load]);

  const addMember = useCallback(async (teamId: string, d: { user_id: string; experience?: number }) => {
    await adminTicketService.addMember(teamId, d);
  }, []);

  const agents    = users.filter((u) => u.role === 'agent' || u.role === 'team_lead');
  const teamLeads = users.filter((u) => u.role === 'team_lead');

  return { teams, products, users, agents, teamLeads, loading, createTeam, deactivateTeam, addMember };
};
