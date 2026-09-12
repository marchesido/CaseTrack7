import api from './api';

/**
 * Serviço para integração com a Google Calendar API v3
 */
const googleCalendarService = {
  /**
   * Obtém a URL de autorização OAuth2 para consentimento do usuário.
   */
  getAuthUrl: async () => {
    const response = await api.get('/productions/google/auth-url');
    return response.data;
  },

  /**
   * Conecta a conta Google usando o código retornado pelo OAuth2.
   */
  connect: async (code) => {
    const response = await api.post('/productions/google/connect', { code });
    return response.data;
  },

  /**
   * Retorna o status da conexão global do Google Calendar.
   */
  getStatus: async () => {
    const response = await api.get('/productions/google/status');
    return response.data;
  },

  /**
   * Desconecta a conta Google.
   */
  disconnect: async () => {
    const response = await api.post('/productions/google/disconnect');
    return response.data;
  },

  /**
   * Sincroniza uma produção específica no Google Calendar.
   */
  syncProduction: async (productionId) => {
    const response = await api.post(`/productions/${productionId}/sync-google`);
    return response.data;
  },
};

export default googleCalendarService;
