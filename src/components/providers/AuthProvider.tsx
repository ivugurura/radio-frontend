import React, { useState, useEffect } from 'react';

import { jwtDecode } from 'jwt-decode';
import { useDispatch } from 'react-redux';
import { lStorage } from '../../libs/constants';
import { validateUserAuthentication } from '../../libs/auth';
import {
  AuthContext,
  type AuthContextState,
  initialState,
} from './AuthContext';
import { setUser } from '../../redux/actions';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthContextState>(initialState);
  const dispatch = useDispatch();

  const clearLocalStorage = () => {
    localStorage.removeItem('user-token');
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
            dispatch(setUser(data));
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

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};
