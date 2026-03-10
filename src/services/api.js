import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_IP = '172.24.195.197';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (DEVICE_IP) {
    return `http://${DEVICE_IP}:5000/api`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api'; // Android Emulator loopback
  }
  return 'http://localhost:5000/api'; // iOS Simulator
};

export const API_URL = getBaseUrl();
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || API_URL.replace('/api', '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('movex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
