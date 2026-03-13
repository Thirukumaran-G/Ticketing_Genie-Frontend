// src/features/notifications/slices/notificationsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { NotificationItem } from '../../../types';
import { notificationsService } from '../services/notificationsService';

interface NotifState {
  items: NotificationItem[];
  isLoading: boolean;
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async () => notificationsService.list(),
);

export const markReadThunk = createAsyncThunk(
  'notifications/markRead',
  async (id: string) => notificationsService.markRead(id),
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], isLoading: false } as NotifState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending, (s) => { s.isLoading = true; });
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.isLoading = false; s.items = a.payload; });
    b.addCase(markReadThunk.fulfilled, (s, a) => {
    const idx = s.items.findIndex((n) => n.id === a.meta.arg); 
    if (idx !== -1) s.items[idx].is_read = true;              
    });
  },
});

export default notificationsSlice.reducer;
