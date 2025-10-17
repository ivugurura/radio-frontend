import React, { useState, useEffect } from 'react';

import { jwtDecode } from 'jwt-decode';
import { lStorage } from '../../libs/constants';
import { validateUserAuthentication } from '../../libs/auth';
import {
  AuthContext,
  type AuthContextState,
  initialState,
} from './AuthContext';
import type { UserType } from '@graphql/graphql';
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthContextState>(initialState);

  const clearLocalStorage = () => {
    lStorage.remove();
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const validateAuth = async () => {
    try {
      // Check if token exist
      const { token } = lStorage;

      if (token) {
        const { exp } = jwtDecode(token);
        // Validate token expiration time
        const currentTime = Date.now() / 1000;
        if (exp! > currentTime) {
          const { isAuthenticated, data } = await validateUserAuthentication();
          if (isAuthenticated) {
            setState((prev) => ({ ...prev, isLoading: false, user: data }));
          } else {
            setState((prev) => ({ ...prev, message: 'invalid token' }));
            clearLocalStorage();
          }
        } else {
          // Logout
          setState((prev) => ({ ...prev, message: 'invalid token' }));
          clearLocalStorage();
        }
      } else {
        // Logout
        setState((prev) => ({ ...prev, message: 'invalid token' }));
        clearLocalStorage();
      }
    } catch (error) {
      // Logout
      setState((prev) => ({ ...prev, message: 'invalid token' }));
      clearLocalStorage();
    }
  };

  useEffect(() => {
    validateAuth();
  }, []);

  const setAuthUser = (user?: UserType) => {
    setState((prev) => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }));
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
};
