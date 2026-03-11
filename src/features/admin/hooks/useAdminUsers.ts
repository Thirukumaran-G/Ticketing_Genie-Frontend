import { useState, useEffect } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { AdminUserResponse } from '../../../types';

export const useAdminUsers = () => {
  const [users, setUsers]       = useState<AdminUserResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  const load = async () => {
    setLoading(true);
    try { setUsers(await adminAuthService.listUsers()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all'
    ? users
    : users.filter(u => u.role === filter);

  const deactivate = async (id: string) => {
    await adminAuthService.deactivateUser(id);
    await load();
  };

  return { users, filtered, loading, filter, setFilter, deactivate, reload: load };
};