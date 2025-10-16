import { createContext, useContext } from 'react';

export interface AuthContextState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  message: string;
  setState: (state: Partial<AuthContextState>) => void;
  refreshUserInfo: () => void;
  setAuthUser: (user?: any) => void;
}

export const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  message: '',
  setState: () => {},
  refreshUserInfo: () => {},
  setAuthUser: () => {},
};
export const AuthContext = createContext<AuthContextState>(initialState);

export function useAuth() {
  if (!AuthContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return useContext(AuthContext);
}
