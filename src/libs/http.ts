import axios from 'axios';
import { lStorage } from './constants';

export const http = axios.create({
  baseURL: `${import.meta.env.REACT_APP_API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    Authorization: lStorage.token,
  },
});
