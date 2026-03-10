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
  agent:     '/tickets/queue',
  team_lead: '/tickets/team',
  admin:     '/admin/dashboard',
};

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = typeof SEVERITIES[number];

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type Priority = typeof PRIORITIES[number];

export const TICKET_STATUSES = ['new', 'acknowledged', 'open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const DATE_FORMAT        = 'MMM d, yyyy';
export const DATE_TIME_FORMAT   = 'MMM d, yyyy · h:mm a';

export const ENVIRONMENTS = ['production', 'staging', 'development', 'local'] as const;
export type Environment = typeof ENVIRONMENTS[number];
