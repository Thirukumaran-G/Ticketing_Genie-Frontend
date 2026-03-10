import { createSlice } from '@reduxjs/toolkit';
const productConfigSlice = createSlice({ name: 'productConfig', initialState: { items: [], isLoading: false }, reducers: {} });
export default productConfigSlice.reducer;
