import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL as ENV_API_URL, SOCKET_URL as ENV_SOCKET_URL } from '@env';

const DEVICE_IP = null;

const getBaseUrl = () => {
  // Priority 1: react-native-dotenv from @env
  if (ENV_API_URL) return ENV_API_URL;

  if (DEVICE_IP) {
    return `http://${DEVICE_IP}:5000/api`;
  }
  if (Platform.OS === 'android') {
    return 'https://move-x-backend.onrender.com/api'; // Live Backend
  }
  return 'https://move-x-backend.onrender.com/api'; // Live Backend
};

export const API_URL = getBaseUrl();
export const SOCKET_URL = ENV_SOCKET_URL || API_URL.replace('/api', '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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
    console.error('[API Error]', error.config?.url, error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
