import { createSlice } from '@reduxjs/toolkit';
const reportsSlice = createSlice({ name: 'reports', initialState: { data: null, isLoading: false }, reducers: {} });
export default reportsSlice.reducer;
