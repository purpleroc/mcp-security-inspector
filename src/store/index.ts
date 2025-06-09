import { configureStore } from '@reduxjs/toolkit';
import mcpReducer from './mcpSlice';

export const store = configureStore({
  reducer: {
    mcp: mcpReducer
  },
  devTools: process.env.NODE_ENV === 'development'
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;