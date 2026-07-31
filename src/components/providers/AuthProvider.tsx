import React, { useState, useEffect } from 'react';

import { jwtDecode } from 'jwt-decode';
import { lStorage } from '../../libs/constants';
import { validateUserAuthentication } from '../../libs/auth';
import { defaultRefreshAccessToken } from '@graphql/client';
import {
  AuthContext,
  type AuthContextState,
  initialState,
} from './AuthContext';
import type { UserType } from '@graphql/graphql';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthContextState>(initialState);

  const clearLocalStorage = () => {
    lStorage.removeAll();
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const validateAuth = async () => {
    try {
      const token = lStorage.get();

      if (!token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          user: null,
        }));
        return;
      }

      const { exp } = jwtDecode<{ exp?: number }>(token);
      const currentTime = Date.now() / 1000;
      if (!exp || exp <= currentTime) {
        const refreshedToken = await defaultRefreshAccessToken();
        if (!refreshedToken) {
          setState((prev) => ({ ...prev, message: 'invalid token' }));
          clearLocalStorage();
          return;
        }
      }

      let { isAuthenticated, data } = await validateUserAuthentication();
      if (!isAuthenticated) {
        const refreshedToken = await defaultRefreshAccessToken();
        if (refreshedToken) {
          const retriedAuth = await validateUserAuthentication();
          isAuthenticated = retriedAuth.isAuthenticated;
          data = retriedAuth.data;
        }
      }

      if (isAuthenticated) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated,
          user: data as UserType,
        }));
      } else {
        setState((prev) => ({ ...prev, message: 'invalid token' }));
        clearLocalStorage();
      }
    } catch (error: unknown) {
      // Logout
      console.error('Error validating authentication:', error);
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
      user: user ?? null,
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
