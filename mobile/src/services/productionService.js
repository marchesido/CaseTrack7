import api from './api';

/**
 * Serviço de Produções Audiovisuais - CaseTrack
 * Encapsula todas as chamadas HTTP para os endpoints /api/v1/productions, etapas e movimentações.
 */
export const productionService = {
  /**
   * Lista produções com filtros opcionais
   * @param {{ status?: string, search?: string, startDate?: string, endDate?: string, skip?: number, take?: number }} [params]
   */
  async list(params = {}) {
    const response = await api.get('/productions', { params });
    return response.data;
  },

  /**
   * Obtém as pendências do usuário logado (etapas atribuídas e devoluções pendentes)
   */
  async getMyPending() {
    const response = await api.get('/productions/my/pending');
    return response.data;
  },

  /**
   * Obtém detalhes completos de uma produção pelo ID
   * @param {string} id - UUID da produção
   */
  async getById(id) {
    const response = await api.get(`/productions/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova produção com etapas automáticas e equipamentos vinculados
   * @param {{
   *   title: string,
   *   description?: string,
   *   scheduledAt: string,
   *   scheduledEndAt?: string,
   *   isAllDay?: boolean,
   *   timezone?: string,
   *   equipmentIds?: string[],
   *   assignees?: {
   *     captureResponsibleUserId?: string,
   *     editingResponsibleUserId?: string,
   *     backupResponsibleUserId?: string,
   *     uploadResponsibleUserId?: string
   *   }
   * }} data
   */
  async create(data) {
    const response = await api.post('/productions', data);
    return response.data;
  },

  /**
   * Atualiza dados cadastrais da produção (ADMIN)
   * @param {string} id
   * @param {object} data
   */
  async update(id, data) {
    const response = await api.patch(`/productions/${id}`, data);
    return response.data;
  },

  /**
   * Cancelamento lógico da produção (ADMIN)
   * @param {string} id
   */
  async delete(id) {
    const response = await api.delete(`/productions/${id}`);
    return response.data;
  },

  /**
   * Inicia uma etapa (PENDING -> IN_PROGRESS)
   * @param {string} productionId
   * @param {string} stageId
   */
  async startStage(productionId, stageId) {
    const response = await api.patch(`/productions/${productionId}/stages/${stageId}/start`);
    return response.data;
  },

  /**
   * Conclui uma etapa (IN_PROGRESS -> COMPLETED)
   * @param {string} productionId
   * @param {string} stageId
   */
  async completeStage(productionId, stageId) {
    const response = await api.post(`/productions/${productionId}/stages/${stageId}/complete`);
    return response.data;
  },

  /**
   * Realiza checkout (retirada) ou reprovação de inspeção
   * @param {string} productionId
   * @param {string} peId - ID do ProductionEquipment
   * @param {{ condition: 'OK' | 'DAMAGED', damageId?: string, notes?: string }} data
   */
  async checkoutEquipment(productionId, peId, data) {
    const response = await api.post(`/productions/${productionId}/equipments/${peId}/checkout`, data);
    return response.data;
  },

  /**
   * Realiza checkin (devolução) com verificação de avaria e auto-conclusão
   * @param {string} productionId
   * @param {string} peId - ID do ProductionEquipment
   * @param {{ condition: 'OK' | 'DAMAGED', damageId?: string, notes?: string }} data
   */
  async checkinEquipment(productionId, peId, data) {
    const response = await api.post(`/productions/${productionId}/equipments/${peId}/checkin`, data);
    return response.data;
  },

  /**
   * Substitui equipamento avariado na produção (Regra B13 - ADMIN)
   * @param {string} productionId
   * @param {string} peId - ID do ProductionEquipment original avariado
   * @param {{ replacementEquipmentId: string, reason: string }} data
   */
  async substituteEquipment(productionId, peId, data) {
    const response = await api.patch(
      `/productions/${productionId}/equipments/${peId}/substitute`,
      data,
    );
    return response.data;
  },
};

export default productionService;
