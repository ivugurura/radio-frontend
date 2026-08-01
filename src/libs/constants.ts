import { toast } from 'react-toastify';

export const currentYear = new Date().getFullYear();

export const BASE_API_URL = import.meta.env.VITE_API_URL;

export const APP_SCHEMA = import.meta.env.VITE_APP_SCHEMA;

export const STUDIO_URL = import.meta.env.VITE_STUDIO_URL;

export const STUDIO_ID = 'reformation-rw';

const ACCESS_TOKEN_KEY = 'user-token';
const REFRESH_TOKEN_KEY = 'refresh-token';

export const lStorage = {
  get token() {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
  },
  get refreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
  },
  save: (token: string, refreshToken?: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (typeof refreshToken === 'string') {
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  },
  saveRefreshToken: (refreshToken: string) => {
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  remove: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
  removeAll: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  get: () => localStorage.getItem(ACCESS_TOKEN_KEY) || '',
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY) || '',
  clear: () => {
    localStorage.clear();
  },
  store: localStorage,
};

export const notifier = {
  error: (msg: string, msgId = 13) =>
    toast.error(msg, {
      position: 'bottom-right',
      toastId: msgId,
    }),
  success: (msg: string, msgId = 14) =>
    toast.success(msg, {
      position: 'bottom-left',
      toastId: msgId,
    }),
};

export const getTrackUrl = (studioSlug: string, trackId: string) => {
  return `${BASE_API_URL}/studios/${studioSlug}/tracks/${trackId}`;
};
