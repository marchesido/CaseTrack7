import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { BASE_URL, setAuthToken, clearAuthToken, registerUnauthorizedHandler } from '../services/api';
import secureStorage from '../utils/secureStorage';
import showAlert from '../utils/alert';

const STORAGE_TOKEN_KEY = 'casetrack_auth_token';
const STORAGE_USER_KEY = 'casetrack_auth_user';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const performLogout = useCallback(async () => {
    clearAuthToken();
    try {
      await secureStorage.removeItem(STORAGE_TOKEN_KEY);
      await secureStorage.removeItem(STORAGE_USER_KEY);
    } catch (err) {
      console.warn('[AuthContext] Erro ao limpar secureStorage no logout:', err);
    }
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const handleSessionExpired = useCallback(() => {
    performLogout();
    showAlert(
      'Sessão Expirada',
      'Sua sessão foi finalizada ou expirou. Por favor, acesse novamente com suas credenciais.',
    );
  }, [performLogout]);

  // Registra tratador de 401 desacoplado e restaura sessão salva com validação
  useEffect(() => {
    const unregister = registerUnauthorizedHandler(handleSessionExpired);

    const restoreSession = async () => {
      try {
        const [savedToken, savedUserStr] = await Promise.all([
          secureStorage.getItem(STORAGE_TOKEN_KEY),
          secureStorage.getItem(STORAGE_USER_KEY),
        ]);

        if (savedToken && savedUserStr) {
          let parsedUser = null;
          try {
            parsedUser = JSON.parse(savedUserStr);
          } catch (parseErr) {
            console.warn('[AuthContext] Usuário salvo inválido no secureStorage:', parseErr);
          }

          if (parsedUser) {
            // 1. Inicialização Otimista Imediata: usuário acessa a Home em milissegundos sem delay
            setAuthToken(savedToken);
            setToken(savedToken);
            setUser(parsedUser);
            setLoading(false);

            // 2. Revalidação em background NÃO-BLOQUEANTE com tolerância a falhas de rede
            try {
              const profileRes = await axios.get(`${BASE_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${savedToken}` },
                timeout: 3500,
              });

              if (profileRes.data) {
                const activeUser = { ...parsedUser, ...profileRes.data };
                setUser(activeUser);
                secureStorage
                  .setItem(STORAGE_USER_KEY, JSON.stringify(activeUser))
                  .catch(() => {});
              }
            } catch (validateErr) {
              const status = validateErr.response?.status;
              // Apenas encerra sessão se a API responder expressamente HTTP 401 Unauthorized
              if (status === 401) {
                console.warn('[AuthContext] Token persistido expirado (401). Limpando sessão.');
                clearAuthToken();
                await Promise.all([
                  secureStorage.removeItem(STORAGE_TOKEN_KEY),
                  secureStorage.removeItem(STORAGE_USER_KEY),
                ]);
                setToken(null);
                setUser(null);
                showAlert(
                  'Sessão Expirada',
                  'Sua sessão foi finalizada ou expirou. Por favor, acesse novamente com suas credenciais.',
                );
              } else {
                // Falha de rede (sem internet, timeout, 5xx): preserva a sessão em cache
                console.log(
                  '[AuthContext] Falha de conexão transitória na validação de token. Sessão local preservada.',
                );
              }
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Falha ao restaurar sessão persistida:', err);
        clearAuthToken();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    return () => {
      if (typeof unregister === 'function') {
        unregister();
      }
    };
  }, [handleSessionExpired]);

  const login = async (email, password) => {
    setAuthError(null);
    const cleanEmail = email?.trim()?.toLowerCase();

    if (!cleanEmail || !password) {
      const errMessage = 'Informe o e-mail e a senha para continuar.';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/auth/login`,
        { email: cleanEmail, password },
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
      );

      const { access_token, user: loggedUser } = response.data;

      if (!access_token || !loggedUser) {
        throw new Error('Resposta de autenticação inválida do servidor.');
      }

      setAuthToken(access_token);
      await Promise.all([
        secureStorage.setItem(STORAGE_TOKEN_KEY, access_token),
        secureStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedUser)),
      ]);

      setToken(access_token);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      let errorMessage = 'Não foi possível realizar o login.';

      if (!err.response) {
        errorMessage = 'Servidor indisponível. Verifique sua conexão e tente novamente.';
      } else if (err.response.status === 401 || err.response.status === 400) {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (err.response.data?.message) {
        errorMessage = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(', ')
          : err.response.data.message;
      }

      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    await performLogout();
  };

  const value = {
    user,
    token,
    loading,
    authError,
    login,
    logout,
    isAdmin: user?.role === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};

export default AuthContext;
