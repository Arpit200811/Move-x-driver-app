import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL as ENV_API_URL, SOCKET_URL as ENV_SOCKET_URL } from '@env';

const DEVICE_IP = null;

const getBaseUrl = () => {
  // Use Render as the absolute source of truth if not local debugging
  const PROD_URL = 'https://move-x-backend.onrender.com/api';
  
  if (ENV_API_URL && !ENV_API_URL.includes('localhost')) return ENV_API_URL;

  if (DEVICE_IP) {
    return `http://${DEVICE_IP}:5000/api`;
  }
  return PROD_URL;
};

export const API_URL = getBaseUrl();
console.log('[NETWORK] Base System URL:', API_URL);

export const SOCKET_URL = ENV_SOCKET_URL || API_URL.replace('/api', '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000, // Increased to 45s for Render wake-up
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('movex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const fullUrl = error.config?.baseURL + (error.config?.url || '');
    console.error('[API Error Source]:', fullUrl);
    console.error('[API Error Info]:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
