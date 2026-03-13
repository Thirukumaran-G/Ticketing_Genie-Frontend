import { useState, useEffect, useCallback } from 'react';
import { adminAuthService, UserCreateRequest } from '../services/adminAuthService';
import { AdminUserResponse } from '../../../types';

export const useAdminUsers = () => {
  const [users,    setUsers]    = useState<AdminUserResponse[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAuthService.listUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all'
    ? users
    : users.filter(u => u.role === filter);

  const deactivate = async (id: string) => {
    await adminAuthService.deactivateUser(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
  };

  const createUser = async (payload: UserCreateRequest): Promise<AdminUserResponse> => {
    setCreating(true);
    try {
      const newUser = await adminAuthService.createUser(payload);
      setUsers(prev => [newUser, ...prev]);
      return newUser;
    } finally {
      setCreating(false);
    }
  };

  return { users, filtered, loading, creating, filter, setFilter, deactivate, createUser };
};