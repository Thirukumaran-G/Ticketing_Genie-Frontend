// src/app/rootReducer.ts — combines all feature reducers
import { combineReducers } from '@reduxjs/toolkit';

import authReducer          from '../features/auth/slices/authSlice';
import ticketsReducer       from '../features/tickets/slices/ticketsSlice';
import notificationsReducer from '../features/notifications/slices/notificationsSlice';
import teamsReducer         from '../features/admin/slices/teamsSlice';
import slaReducer           from '../features/admin/slices/slaSlice';
import emailConfigReducer   from '../features/admin/slices/emailConfigSlice';
import keywordRulesReducer  from '../features/admin/slices/keywordRulesSlice';
import productConfigReducer from '../features/admin/slices/productConfigSlice';
import reportsReducer       from '../features/admin/slices/reportsSlice';
import usersReducer         from '../features/admin/slices/usersSlice';

export const rootReducer = combineReducers({
  auth:          authReducer,
  tickets:       ticketsReducer,
  notifications: notificationsReducer,
  // admin domain
  teams:         teamsReducer,
  sla:           slaReducer,
  emailConfig:   emailConfigReducer,
  keywordRules:  keywordRulesReducer,
  productConfig: productConfigReducer,
  reports:       reportsReducer,
  users:         usersReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
