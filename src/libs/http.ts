import axios from 'axios';
import { lStorage } from './constants';
import { currentLanguageTag } from '@graphql/client';

const http = axios.create({
  baseURL: `${import.meta.env.REACT_APP_API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    Authorization: lStorage.token,
  },
});

// Keep the language header in sync with the active selection on every request.
http.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', currentLanguageTag());
  return config;
});

export default http;
