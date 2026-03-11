// src/features/settings/components/SettingsPageWrapper.tsx
import React from 'react';
import { useAppSelector } from '../../../app/store';
import { SettingsPage } from './SettingsPage';
import { customerNav } from '../../tickets/components/customer/customerNav';
import { agentNav } from '../../tickets/components/agent/agentNav';
import { tlNav } from '../../tickets/components/teamlead/teamleadNav';
import { adminNav } from '../../admin/components/adminNav';
import { ROLES } from '../../../config/constants';

export const SettingsPageWrapper: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);

  const navMap: Record<string, typeof customerNav> = {
    [ROLES.CUSTOMER]:  customerNav,
    [ROLES.AGENT]:     agentNav,
    [ROLES.TEAM_LEAD]: tlNav,
    [ROLES.ADMIN]:     adminNav,
  };

  const navItems = (user?.role ? navMap[user.role] : null) ?? customerNav;

  return <SettingsPage navItems={navItems} />;
};