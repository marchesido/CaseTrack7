import api from './api';

const contractService = {
  /**
   * Emite um novo contrato / termo de responsabilidade para a produção.
   */
  generateForProduction: async (productionId) => {
    const response = await api.post(`/contracts/production/${productionId}`);
    return response.data;
  },

  /**
   * Consulta o contrato mais recente vinculado à produção.
   */
  getByProduction: async (productionId) => {
    const response = await api.get(`/contracts/production/${productionId}`);
    return response.data;
  },

  /**
   * Consulta um contrato por ID.
   */
  getById: async (contractId) => {
    const response = await api.get(`/contracts/${contractId}`);
    return response.data;
  },

  /**
   * Registra a assinatura digital / aceite do termo.
   */
  signContract: async (contractId, data) => {
    const response = await api.post(`/contracts/${contractId}/sign`, data);
    return response.data;
  },

  /**
   * Retorna a URL pública completa para visualização ou download do PDF.
   */
  getPdfUrl: (contract) => {
    if (!contract) return null;
    const base = api.defaults.baseURL.replace(/\/api\/v1\/?$/, '');
    if (contract.documento_url) {
      return `${base}${contract.documento_url}`;
    }
    return `${base}/api/v1/contracts/${contract.id}/download`;
  },
};

export default contractService;
