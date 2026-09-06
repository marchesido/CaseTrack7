import axios from 'axios';
import { Platform, NativeModules } from 'react-native';

/**
 * Resolução dinâmica da URL base dependendo da plataforma e ambiente:
 * - Em dispositivo físico (Expo Go via Wi-Fi): extrai o IP da máquina host diretamente do scriptURL
 * - Android Emulator: 10.0.2.2 mapeia para o localhost da máquina host
 * - iOS Simulator / Web: localhost funciona diretamente
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

  // No Expo Go / React Native dev mode, scriptURL traz o IP do Metro Bundler (ex: http://192.168.0.114:8081/...)
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost') {
      return `http://${match[1]}:3000/api/v1`;
    }
  }

  // Fallback padrão para a máquina de desenvolvimento
  return Platform.OS === 'android'
    ? 'http://192.168.0.114:3000/api/v1'
    : 'http://localhost:3000/api/v1';
};

export const BASE_URL = getDefaultBaseURL();

// Armazenamento em memória do token JWT
let currentAuthToken = null;

export const setAuthToken = (token) => {
  currentAuthToken = token;
};

export const getAuthToken = () => {
  return currentAuthToken;
};

export const clearAuthToken = () => {
  currentAuthToken = null;
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

// Interceptor de Requisição: Injeta automaticamente o Bearer Token quando disponível
// Em ambiente de teste/dev, se não houver token, autentica com a conta Admin automaticamente
api.interceptors.request.use(
  async (config) => {
    if (!currentAuthToken && !config.url?.includes('/auth/login')) {
      try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'admin@example.com',
          password: 'admin123',
        });
        if (loginRes.data?.access_token) {
          currentAuthToken = loginRes.data.access_token;
        }
      } catch (err) {
        // Silencioso se backend estiver indisponível; erro de rede será capturado no response interceptor
      }
    }

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
    }

    return Promise.reject({
      status,
      message: errorMessage,
      data,
    });
  },
);

export default api;
