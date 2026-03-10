import { createSlice } from '@reduxjs/toolkit';
const teamsSlice = createSlice({ name: 'teams', initialState: { items: [], isLoading: false }, reducers: {} });
export default teamsSlice.reducer;
