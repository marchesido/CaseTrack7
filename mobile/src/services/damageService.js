import api, { BASE_URL } from './api';
import { Platform } from 'react-native';

const MAX_DAMAGE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limite da rubrica Tech Forge

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
   * Registra uma nova avaria com até 4 fotos de evidência
   * @param {{
   *   photos?: Array<{ uri: string, fileSize?: number } | string>,
   *   fileUri?: string,
   *   fileSize?: number,
   *   equipmentId: string,
   *   description: string
   * }} param0
   */
  async create({ photos, fileUri, fileSize, equipmentId, description }) {
    // Normaliza para array de fotos
    let photoList = [];
    if (Array.isArray(photos) && photos.length > 0) {
      photoList = photos.map((item) =>
        typeof item === 'string' ? { uri: item } : item,
      );
    } else if (fileUri) {
      photoList = [{ uri: fileUri, fileSize }];
    }

    if (photoList.length === 0) {
      throw new Error('Pelo menos uma foto da avaria é obrigatória para o registro.');
    }

    if (photoList.length > 4) {
      throw new Error('É permitido anexar no máximo 4 fotos por registro de avaria.');
    }

    const formData = new FormData();
    formData.append('descricao', description);
    formData.append('equipment', equipmentId);

    // Processa cada foto para o FormData
    for (let i = 0; i < photoList.length; i++) {
      const p = photoList[i];

      if (Platform.OS === 'web') {
        const res = await fetch(p.uri);
        const rawBlob = await res.blob();
        
        if (rawBlob.size > MAX_DAMAGE_IMAGE_SIZE) {
          const mb = (rawBlob.size / (1024 * 1024)).toFixed(1);
          throw new Error(
            `A foto ${i + 1} possui ${mb}MB e excede o limite máximo permitido de 5MB.`,
          );
        }

        const mime = rawBlob.type || (p.fileName && p.fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const baseName = p.fileName
          ? p.fileName.replace(/\.[^.]+$/, '')
          : `damage_${Date.now()}_${i}`;
        const safeFilename = `${baseName}.${ext}`;

        const cleanBlob = new Blob([rawBlob], { type: mime });
        formData.append('files', cleanBlob, safeFilename);
      } else {
        if (p.fileSize && p.fileSize > MAX_DAMAGE_IMAGE_SIZE) {
          const mb = (p.fileSize / (1024 * 1024)).toFixed(1);
          throw new Error(
            `A foto ${i + 1} possui ${mb}MB e excede o limite máximo permitido de 5MB.`,
          );
        }

        const uriParts = p.uri.split('/');
        const lastSegment = uriParts.pop() || `damage_${Date.now()}_${i}.jpg`;
        const extMatch = /\.(\w+)$/.exec(lastSegment);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const filename = lastSegment.includes('.') ? lastSegment : `${lastSegment}.${ext}`;

        formData.append('files', {
          uri: p.uri,
          name: filename,
          type: mimeType,
        });
      }
    }

    const headers = Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };

    try {
      const response = await api.post('/damages', formData, {
        headers,
      });
      return response.data;
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      if (apiMessage) {
        throw new Error(
          Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage,
        );
      }
      throw err;
    }
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
   * Helper defensivo de parsing retrocompatível para fotos de avaria:
   * - Retorna [] se nulo ou vazio
   * - Suporta entradas legadas com URL única retornando [url]
   * - Faz split determinístico por vírgula para múltiplas URLs
   * @param {string} imagePath
   * @returns {string[]}
   */
  parseImageUrls(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
      return [];
    }
    return imagePath
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },

  /**
   * Retorna array de URLs absolutas completas para todas as fotos de uma avaria
   * @param {string} imagePath
   * @returns {string[]}
   */
  getFullImageUrls(imagePath) {
    const rawList = this.parseImageUrls(imagePath);
    return rawList
      .map((item) => this.getFullImageUrl(item))
      .filter(Boolean);
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
