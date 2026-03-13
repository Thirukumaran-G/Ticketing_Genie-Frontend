// src/features/tickets/slices/ticketsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  CustomerTicketListItem,
  CustomerTicketDetail,
  TicketQueueItem,
  TicketDetail,
  TLTicketDetail,
  TeamOverviewResponse,
} from '../../../types';
import { ticketsService } from '../services/ticketsService';

interface TicketsState {
  // Customer
  myTickets: CustomerTicketListItem[];
  myTicketDetail: CustomerTicketDetail | null;
  // Agent
  agentQueue: TicketQueueItem[];
  agentTickets: TicketDetail[];
  agentTicketDetail: TicketDetail | null;
  // TeamLead
  tlQueue: TicketQueueItem[];
  tlTickets: TLTicketDetail[];
  tlTicketDetail: TLTicketDetail | null;
  teamOverview: TeamOverviewResponse | null;
  // Products (for dropdown in create form)
  products: { id: string; name: string; is_active: boolean }[];
  // Shared
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const init: TicketsState = {
  myTickets: [], myTicketDetail: null,
  agentQueue: [], agentTickets: [], agentTicketDetail: null,
  tlQueue: [], tlTickets: [], tlTicketDetail: null, teamOverview: null,
  products: [],
  isLoading: false, isSubmitting: false, error: null,
};

const apiErr = (e: unknown) =>
  (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Error';

// ── Customer thunks ───────────────────────────────────────────────────────────

export const fetchMyTickets = createAsyncThunk(
  'tickets/fetchMyTickets',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.listMyTickets(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchMyTicket = createAsyncThunk(
  'tickets/fetchMyTicket',
  async (id: string, { rejectWithValue }) => {
    try { return await ticketsService.getMyTicket(id); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

/**
 * createTicketThunk — now accepts an optional `files` array.
 * Files are passed through to ticketsService.createTicket() which sends
 * them as part of a single multipart/form-data request. The backend saves
 * attachments synchronously before returning the 201 response.
 *
 * Usage:
 *   dispatch(createTicketThunk({ title, description, product_id, customer_severity, files }))
 */
export const createTicketThunk = createAsyncThunk(
  'tickets/create',
  async (
    payload: {
      title: string;
      description: string;
      product_id: string;
      customer_severity: 'critical' | 'high' | 'medium' | 'low';
      environment?: string;
      source?: string;
      files?: File[];           // ← new: optional attachments
    },
    { rejectWithValue },
  ) => {
    try {
      return await ticketsService.createTicket(payload);
    } catch (e) {
      return rejectWithValue(apiErr(e));
    }
  },
);

// ── Agent thunks ──────────────────────────────────────────────────────────────

export const fetchAgentQueue = createAsyncThunk(
  'tickets/fetchAgentQueue',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.getAgentQueue(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchAgentTicket = createAsyncThunk(
  'tickets/fetchAgentTicket',
  async (id: string, { rejectWithValue }) => {
    try { return await ticketsService.getAgentTicket(id); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const updateAgentStatusThunk = createAsyncThunk(
  'tickets/updateAgentStatus',
  async (
    p: { ticketId: string; status: string; reason?: string },
    { rejectWithValue },
  ) => {
    try { return await ticketsService.updateAgentStatus(p.ticketId, p.status, p.reason); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchAgentAllTickets = createAsyncThunk(
  'tickets/fetchAgentAllTickets',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.getAgentTickets(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

// ── Team Lead thunks ──────────────────────────────────────────────────────────

export const fetchTLQueue = createAsyncThunk(
  'tickets/fetchTLQueue',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.getTLQueue(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchTLTickets = createAsyncThunk(
  'tickets/fetchTLTickets',
  async (status: string | undefined, { rejectWithValue }) => {
    try { return await ticketsService.getTLTickets(status); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchTLTicket = createAsyncThunk(
  'tickets/fetchTLTicket',
  async (id: string, { rejectWithValue }) => {
    try { return await ticketsService.getTLTicket(id); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const manualAssignThunk = createAsyncThunk(
  'tickets/manualAssign',
  async (p: { ticketId: string; agent_user_id: string }, { rejectWithValue }) => {
    try { return await ticketsService.manualAssign(p.ticketId, p.agent_user_id); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchTeamOverview = createAsyncThunk(
  'tickets/teamOverview',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.getTeamOverview(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

export const fetchProducts = createAsyncThunk(
  'tickets/fetchProducts',
  async (_, { rejectWithValue }) => {
    try { return await ticketsService.getProducts(); }
    catch (e) { return rejectWithValue(apiErr(e)); }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: init,
  reducers: {
    clearMyTicketDetail: (s) => { s.myTicketDetail = null; },
    clearAgentTicketDetail: (s) => { s.agentTicketDetail = null; },
    clearTLTicketDetail: (s) => { s.tlTicketDetail = null; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    const loading = (s: TicketsState) => { s.isLoading = true; s.error = null; };
    const fail = (s: TicketsState, a: { payload: unknown }) => {
      s.isLoading = false; s.error = a.payload as string;
    };

    b.addCase(fetchMyTickets.pending, loading)
      .addCase(fetchMyTickets.fulfilled, (s, a) => { s.isLoading = false; s.myTickets = a.payload; })
      .addCase(fetchMyTickets.rejected, fail);

    b.addCase(fetchMyTicket.pending, loading)
      .addCase(fetchMyTicket.fulfilled, (s, a) => { s.isLoading = false; s.myTicketDetail = a.payload; })
      .addCase(fetchMyTicket.rejected, fail);

    // createTicketThunk: files are ephemeral — no Redux state needed for them.
    // isSubmitting drives the loading spinner on the form button.
    b.addCase(createTicketThunk.pending, (s) => { s.isSubmitting = true; s.error = null; })
      .addCase(createTicketThunk.fulfilled, (s) => { s.isSubmitting = false; })
      .addCase(createTicketThunk.rejected, (s, a) => { s.isSubmitting = false; s.error = a.payload as string; });

    b.addCase(fetchAgentQueue.pending, loading)
      .addCase(fetchAgentQueue.fulfilled, (s, a) => { s.isLoading = false; s.agentQueue = a.payload; })
      .addCase(fetchAgentQueue.rejected, fail);

    b.addCase(fetchAgentTicket.pending, loading)
      .addCase(fetchAgentTicket.fulfilled, (s, a) => { s.isLoading = false; s.agentTicketDetail = a.payload; })
      .addCase(fetchAgentTicket.rejected, fail);

    b.addCase(fetchAgentAllTickets.pending, loading)
      .addCase(fetchAgentAllTickets.fulfilled, (s, a) => { s.isLoading = false; s.agentTickets = a.payload; })
      .addCase(fetchAgentAllTickets.rejected, fail);

    b.addCase(updateAgentStatusThunk.fulfilled, (s, a) => { s.agentTicketDetail = a.payload; });

    b.addCase(fetchTLQueue.pending, loading)
      .addCase(fetchTLQueue.fulfilled, (s, a) => { s.isLoading = false; s.tlQueue = a.payload; })
      .addCase(fetchTLQueue.rejected, fail);

    b.addCase(fetchTLTickets.pending, loading)
      .addCase(fetchTLTickets.fulfilled, (s, a) => { s.isLoading = false; s.tlTickets = a.payload; })
      .addCase(fetchTLTickets.rejected, fail);

    b.addCase(fetchTLTicket.pending, loading)
      .addCase(fetchTLTicket.fulfilled, (s, a) => { s.isLoading = false; s.tlTicketDetail = a.payload; })
      .addCase(fetchTLTicket.rejected, fail);

    b.addCase(manualAssignThunk.fulfilled, (s, a) => { s.tlTicketDetail = a.payload; });

    b.addCase(fetchTeamOverview.fulfilled, (s, a) => { s.teamOverview = a.payload; });

    b.addCase(fetchProducts.fulfilled, (s, a) => { s.products = a.payload; });
  },
});

export const {
  clearMyTicketDetail, clearAgentTicketDetail, clearTLTicketDetail, clearError,
} = ticketsSlice.actions;
export default ticketsSlice.reducer;