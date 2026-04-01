export type UserRole = 'customer' | 'agent' | 'team_lead' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  company_id?: string;
  is_active?: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitialising:  boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export interface TicketCreateResponse {
  ticket_id: string;
  ticket_number: string;
  status: string;
  message: string;
}

export interface CustomerTicketListItem {
  id: string;
  ticket_number: string;
  title?: string;
  status: string;
  customer_priority?: string;
  priority?: string;
  severity?: string;
  product_id?: string;
  environment?: string;
  source?: string;
  sla_response_due?: string;
  sla_resolve_due?: string;
  created_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface CustomerTicketDetail extends CustomerTicketListItem {
  assigned_to?:             string;       
  description?:             string;
  priority_overridden:      boolean;
  customer_priority?: string;
  override_reason?:         string;
  tier_snapshot?:           string;
  first_response_at?:       string;
  reopen_count:             number;
  sla_breached_at?:         string;
  response_sla_breached_at?: string;
}

export interface TicketQueueItem {
  id: string;
  ticket_number: string;
  title?: string;
  status: string;
  severity?: string;
  priority?: string;
  product_id?: string;
  team_id?: string;
  assigned_to?: string;
  tier_snapshot?: string;
  sla_response_due?: string;
  sla_resolve_due?: string;
  sla_breached_at?: string;           
  response_sla_breached_at?: string;  
  created_at: string;
}

export interface TicketDetail extends TicketQueueItem {
  description?:                string;
  customer_id:                 string;
  company_id?:                 string;
  source?:                     string;
  environment?:                string;
  customer_priority?:          string;
  priority_overridden:         boolean;
  override_reason?:            string;
  ai_draft?:                   string;
  first_response_at?:          string;
  reopen_count:                number;
  resolved_at?:                string;
  closed_at?:                  string;
  on_hold_started_at?:         string | null;
  on_hold_duration_accumulated?: number;
}

export interface TLTicketDetail extends TicketDetail {
  updated_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  ticket_id?: string;
  is_read: boolean;
  is_internal: boolean;
  created_at: string;
}

// ── Team Lead ─────────────────────────────────────────────────────────────────
export interface AgentWorkloadItem {
  user_id:      string;
  full_name?:   string | null;   // resolved from auth-service
  experience?:  number;
  open_tickets: number;
  skills?:      Record<string, unknown>;
}

export interface TeamOverviewResponse {
  team_id:          string;
  team_name:        string;
  product_id:       string;
  unassigned_count: number;
  agents:           AgentWorkloadItem[];
}

export interface ConversationItem {
  id:          string;
  author_id:   string;
  author_type: 'customer' | 'agent';
  content:     string;
  is_internal: boolean;
  is_ai_draft: boolean;
  created_at:  string;
  updated_at:  string;
}

export interface AttachmentItem {
  id:          string;
  ticket_id:   string;
  file_name:   string;
  file_size:   number | null;
  mime_type:   string | null;
  uploaded_by: string | null;
  created_at:  string;
}

export interface TicketThreadResponse {
  conversations: ConversationItem[];
  attachments:   AttachmentItem[];
}

export interface NotificationPreference {
  user_id:           string;
  preferred_contact: 'email' | 'in_app';
}

// ── Admin — Auth service ──────────────────────────────────────────────────────
export interface CompanyResponse { id: string; name: string; domain?: string; is_active: boolean; }
export interface ProductResponse       { id: string; name: string; is_active: boolean; code: string; description: string; }
export interface TierResponse          { id: string; name: string; }
export interface RoleResponse          { id: string; name: string; }
export interface SubscriptionResponse  { id: string; company_id: string; product_id: string; tier_id: string; is_active: boolean; }
export interface AdminUserResponse     { id: string; full_name: string; email: string; role: string; is_active: boolean; company_id?: string; }

// ── Admin — Ticket service ────────────────────────────────────────────────────
export interface EmailConfigResponse       { id: string; key: string; value?: string; is_secret: boolean; is_active: boolean; updated_at?: string; }
export interface SLARuleResponse           { id: string; tier_id: string; priority: string; response_time_min: number; resolution_time_min: number; is_active: boolean; }
export interface SeverityPriorityMapResponse { id: string; severity: string; tier_id: string; derived_priority: string; is_active: boolean; }
export interface KeywordRuleResponse       { id: string; keyword: string; severity: string; is_active: boolean; }
export interface ProductConfigResponse     { id: string; product_id: string; min_severity?: string; default_escalate: boolean; is_active: boolean; }
export interface TeamResponse              { id: string; name: string; product_id: string; team_lead_id?: string; is_active: boolean; }
export interface TeamMemberResponse        { id: string; team_id: string; user_id: string; experience?: number; skills?: Record<string, unknown>; is_active: boolean; }