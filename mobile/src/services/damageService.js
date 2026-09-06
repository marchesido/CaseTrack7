import api, { BASE_URL } from './api';
import { Platform } from 'react-native';

const MAX_DAMAGE_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB limite da controller damages

/**
 * Serviço de Avarias - CaseTrack
 * Encapsula chamadas HTTP para o endpoint /api/v1/damages
 */
export const damageService = {
  /**
   * Lista todas as avarias registradas
   */
  async list() {
    const response = await api.get('/damages');
    return response.data;
  },

  /**
   * Obtém detalhes de uma avaria por ID
   * @param {number} id
   */
  async getById(id) {
    const response = await api.get(`/damages/${id}`);
    return response.data;
  },

  /**
   * Registra uma nova avaria com foto obrigatória
   * @param {{ fileUri: string, fileSize?: number, equipmentId: string, description: string }} param0
   */
  async create({ fileUri, fileSize, equipmentId, description }) {
    if (!fileUri) {
      throw new Error('A foto da avaria é obrigatória para o registro.');
    }

    if (fileSize && fileSize > MAX_DAMAGE_IMAGE_SIZE) {
      throw new Error('A imagem da avaria excede o limite máximo permitido de 2MB.');
    }

    const filename = fileUri.split('/').pop() || `damage_${Date.now()}.jpg`;
    const extMatch = /\.(\w+)$/.exec(filename);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('descricao', description);
    formData.append('equipment', equipmentId);

    if (Platform.OS === 'web') {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      if (blob.size > MAX_DAMAGE_IMAGE_SIZE) {
        throw new Error('A imagem da avaria excede o limite máximo permitido de 2MB.');
      }
      formData.append('file', blob, filename);
    } else {
      formData.append('file', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      });
    }

    const headers = Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };

    const response = await api.post('/damages', formData, {
      headers,
    });

    return response.data;
  },

  /**
   * Converte o caminho relativo retornado pela API (/uploads/damages/uuid.jpg) em URL completa
   * @param {string} imagePath
   */
  getFullImageUrl(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const hostRoot = BASE_URL.replace(/\/api\/v1\/?$/, '');
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${hostRoot}${cleanPath}`;
  },

  /**
   * Busca todas as avarias vinculadas a um equipamento específico
   * @param {string} equipmentId - UUID do equipamento
   * @returns {Promise<Array>} Lista de avarias do equipamento
   */
  async getByEquipmentId(equipmentId) {
    if (!equipmentId) return [];
    const list = await this.list();
    if (!Array.isArray(list)) return [];
    return list.filter((item) => {
      const eqId = item.equipment?.id || item.equipment;
      return String(eqId) === String(equipmentId);
    });
  },
};

export default damageService;
