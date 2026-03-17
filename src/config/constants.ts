// src/config/constants.ts — App-wide constants

export const ROLES = {
  CUSTOMER:  'customer',
  AGENT:     'agent',
  TEAM_LEAD: 'team_lead',
  ADMIN:     'admin',
} as const;

export type RoleKey = typeof ROLES[keyof typeof ROLES];

export const ROLE_HOME: Record<string, string> = {
  customer:  '/tickets/mine',
  agent:     '/tickets/agent/all',
  team_lead: '/tickets/team/overview',
  admin:     '/admin/dashboard',
};

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = typeof SEVERITIES[number];

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type Priority = typeof PRIORITIES[number];

// Full status machine — matches backend exactly
// new → acknowledged → assigned → in_progress → resolved → closed
//                                      ↕              ↓
//                                   on_hold        reopened
export const TICKET_STATUSES = [
  'new',
  'acknowledged',
  'assigned',
  'in_progress',
  'on_hold',
  'resolved',
  'closed',
  'reopened',
] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];
export const AGENT_ALLOWED_STATUSES = ['in_progress', 'on_hold', 'resolved'] as const;
export const TL_ALLOWED_STATUSES    = ['in_progress', 'on_hold', 'resolved', 'closed'] as const;

export const DATE_FORMAT      = 'MMM d, yyyy';
export const DATE_TIME_FORMAT = 'MMM d, yyyy · h:mm a';

export const ENVIRONMENTS = ['production', 'staging'] as const;
export type Environment = typeof ENVIRONMENTS[number];