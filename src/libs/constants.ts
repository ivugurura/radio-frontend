import { toast } from 'react-toastify';

export const currentYear = new Date().getFullYear();
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
