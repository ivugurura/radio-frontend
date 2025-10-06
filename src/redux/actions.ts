import { authUserSlice } from './constantSlices';

export { slicedActions as actions } from './apiSliceBuilder';
export const { setUser, resetUser } = authUserSlice.actions;
