import { createSlice } from '@reduxjs/toolkit';
const usersSlice = createSlice({ name: 'users', initialState: { items: [], isLoading: false }, reducers: {} });
export default usersSlice.reducer;
