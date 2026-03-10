import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Move-X Distributed Translation Network Config
const DEVICE_IP = '172.24.195.197';
const API_URL = Platform.OS === 'android' ? `http://${DEVICE_IP}:5000` : 'http://localhost:5000';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const saved = await AsyncStorage.getItem('movex_lang');
    callback(saved || 'en');
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    await AsyncStorage.setItem('movex_lang', lng);
  },
};

i18n
  .use(HttpBackend)
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: `${API_URL}/api/translations/{{lng}}`,
    },
    interpolation: {
      escapeValue: false 
    },
    react: {
      useSuspense: false
    },
    debug: false
  });

export default i18n;
