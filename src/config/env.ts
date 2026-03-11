// src/config/env.ts — Type-safe environment variables
export const ENV = {
  AUTH_BASE:   (import.meta as any).env?.VITE_AUTH_API_URL    || 'http://localhost:8000/api/v1',
  TICKET_BASE: (import.meta as any).env?.VITE_TICKET_API_URL  || 'http://localhost:8002/api/v1',
  NOTIFICATION_BASE: (import.meta as any).env?.VITE_NOTIFICATION_BASE, 
} as const;
