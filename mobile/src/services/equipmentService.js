import api from './api';

/**
 * Serviço de Equipamentos - CaseTrack
 * Encapsula todas as chamadas HTTP para o endpoint /api/v1/equipments
 */
export const equipmentService = {
  /**
   * Lista todos os equipamentos cadastrados
   * @param {number} [skip] - Paginação: quantidade a pular
   * @param {number} [take] - Paginação: quantidade a buscar
   */
  async list(skip, take) {
    const params = {};
    if (skip !== undefined) params.skip = skip;
    if (take !== undefined) params.take = take;
    const response = await api.get('/equipments', { params });
    return response.data;
  },

  /**
   * Obtém detalhes de um equipamento específico pelo ID (UUID)
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/equipments/${id}`);
    return response.data;
  },

  /**
   * Cadastra um novo equipamento
   * @param {{ name: string, description?: string, serialNumber?: string, status?: string, imageUrl?: string }} data
   */
  async create(data) {
    const response = await api.post('/equipments', data);
    return response.data;
  },

  /**
   * Atualiza os dados de um equipamento existente
   * @param {string} id
   * @param {{ name?: string, description?: string, serialNumber?: string, status?: string, imageUrl?: string }} data
   */
  async update(id, data) {
    const response = await api.patch(`/equipments/${id}`, data);
    return response.data;
  },

  /**
   * Remove um equipamento pelo ID
   * @param {string} id
   */
  async delete(id) {
    const response = await api.delete(`/equipments/${id}`);
    return response.data;
  },
};

export default equipmentService;
