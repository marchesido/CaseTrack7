import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolução dinâmica da URL base dependendo da plataforma e ambiente:
 * - Em dispositivo físico (Expo Go via Wi-Fi): extrai o IP da máquina host via Constants.hostUri
 * - Fallback: scriptURL ou IP local atual da máquina (192.168.0.120)
 * - Web: localhost ou hostname atual
 */
const getDefaultBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'localhost';
    return `http://${host}:3000/api/v1`;
  }

  // 1. No Expo Go moderno, extrai dinamicamente o IP do Metro Bundler via Constants
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const extractedHost = hostUri.split(':')[0];
    if (extractedHost && extractedHost !== 'localhost') {
      return `http://${extractedHost}:3000/api/v1`;
    }
  }

  // 2. Extração via NativeModules.SourceCode.scriptURL
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost') {
      return `http://${match[1]}:3000/api/v1`;
    }
  }

  // 3. Fallback padrão para a máquina de desenvolvimento na rede local
  return Platform.OS === 'android'
    ? 'http://192.168.0.120:3000/api/v1'
    : 'http://localhost:3000/api/v1';
};

export const BASE_URL = getDefaultBaseURL();

// Armazenamento em memória do token JWT
let currentAuthToken = null;
let unauthorizedHandler = null;

export const setAuthToken = (token) => {
  currentAuthToken = token;
};

export const getAuthToken = () => {
  return currentAuthToken;
};

export const clearAuthToken = () => {
  currentAuthToken = null;
};

export const registerUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
};

// Instância centralizada do Axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de Requisição: Injeta o Bearer Token JWT quando autenticado
api.interceptors.request.use(
  (config) => {
    if (currentAuthToken) {
      config.headers.Authorization = `Bearer ${currentAuthToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor de Resposta: Tratamento padronizado de erros de rede e da API NestJS
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      // Erro de rede ou servidor fora do ar
      console.warn('[API Network Error]: Não foi possível conectar ao servidor backend.');
      return Promise.reject({
        message: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
        isNetworkError: true,
      });
    }

    const { status, data } = error.response;

    // Se o backend retornou mensagem (ex: class-validator ou HttpException)
    let errorMessage = 'Ocorreu um erro inesperado.';
    if (data?.message) {
      errorMessage = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }

    if (status === 401) {
      console.warn('[API Auth Error]: Sessão expirada ou não autorizada (401).');
      clearAuthToken();
      if (typeof unauthorizedHandler === 'function') {
        try {
          unauthorizedHandler();
        } catch (cbErr) {
          console.warn('[API Auth Error]: Erro no tratador de desautorização:', cbErr);
        }
      }
    }

    if (status === 424) {
      console.warn('[API Google Error]: Reconexão com o Google necessária (424).');
      return Promise.reject({
        status: 424,
        isGoogleReconnectRequired: true,
        error: data?.error || 'GOOGLE_RECONNECT_REQUIRED',
        message:
          errorMessage ||
          'Reconexão com o Google necessária. Por favor, reconecte sua conta Google no painel de configurações.',
        data,
      });
    }

    return Promise.reject({
      status,
      message: errorMessage,
      data,
    });
  },
);

export default api;
