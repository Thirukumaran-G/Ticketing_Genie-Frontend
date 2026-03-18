export const ENV = {
  AUTH_BASE:         (import.meta as any).env?.VITE_AUTH_API_URL       || 'http://localhost:8000/api/v1/auth',
  TICKET_BASE:       (import.meta as any).env?.VITE_TICKET_API_URL     || 'http://localhost:8002/api/v1/ticket',
  NOTIFICATION_BASE: (import.meta as any).env?.VITE_NOTIFICATION_BASE  || 'http://localhost:8002/api/v1/ticket/notifications',
} as const;