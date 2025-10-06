import { createSlice } from '@reduxjs/toolkit';

const initialUserState = {
  isAuthenticated: false,
  user: {},
};

export const authUserSlice = createSlice({
  name: 'auth',
  initialState: initialUserState,
  reducers: {
    setUser: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    resetUser: (state) => {
      state.isAuthenticated = false;
      state.user = {};
    },
  },
});
