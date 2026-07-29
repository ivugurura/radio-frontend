import { toast } from 'react-toastify';

const BASE_API_URL = import.meta.env.VITE_API_URL;

export const currentYear = new Date().getFullYear();

export const APP_SCHEMA = import.meta.env.VITE_APP_SCHEMA;

export const lStorage = {
  token: localStorage.getItem('user-token') || '',
  save: (token: string) => {
    localStorage.setItem('user-token', token);
  },
  remove: () => {
    localStorage.removeItem('user-token');
  },
  get: () => localStorage.getItem('user-token') || '',
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
