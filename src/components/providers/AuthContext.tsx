import { createContext, useContext } from 'react';

export interface AuthContextState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  message: string;
  setState: (state: Partial<AuthContextState>) => void;
  refreshUserInfo: () => void;
}

export const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  message: '',
  setState: () => {},
  refreshUserInfo: () => {},
};
export const AuthContext = createContext<AuthContextState>(initialState);

export function useAuth() {
  return useContext(AuthContext);
}
