// src/features/admin/hooks/useAdminUsers.ts
import { useEffect, useState, useCallback } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { AdminUserResponse } from '../../../types';

export const useAdminUsers = () => {
  const [users, setUsers]     = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = useCallback(() =>
    adminAuthService.listUsers().then(setUsers).finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  const deactivate = useCallback(async (userId: string) => {
    await adminAuthService.deactivateUser(userId);
    load();
  }, [load]);

  const filtered = filter === 'all' ? users : users.filter((u) => u.role === filter);

  return { users, filtered, loading, filter, setFilter, deactivate };
};
