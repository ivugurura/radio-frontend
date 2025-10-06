import { configureStore } from '@reduxjs/toolkit';

import { middlewares, reducers } from './apiSliceBuilder';
import { authUserSlice } from './constantSlices';
import { rtkQueryErrorLogger } from './errorHandler';

export const store = configureStore({
  reducer: {
    auth: authUserSlice.reducer,
    ...reducers,
  },
  devTools: true,
  // ? Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  // prettier-ignore
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({})
    .concat(middlewares, rtkQueryErrorLogger),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
