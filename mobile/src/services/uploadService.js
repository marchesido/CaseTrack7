import api, { BASE_URL } from './api';
import { Platform } from 'react-native';

/**
 * Serviço de Upload de Imagens - CaseTrack
 * Envia arquivos de fotos para o backend NestJS (/api/v1/upload)
 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadService = {
  /**
   * Faz upload de uma imagem local para o servidor com validação de formato e tamanho
   * @param {string} localUri - URI local gerada pelo expo-image-picker
   * @param {number} [fileSize] - Tamanho opcional do arquivo em bytes para validação prévia
   * @returns {Promise<{ message: string, filePath: string, filename: string, url: string }>}
   */
  async uploadImage(localUri, fileSize) {
    if (!localUri) {
      throw new Error('Nenhuma imagem fornecida para upload.');
    }

    if (fileSize && fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('A imagem selecionada excede o limite máximo permitido de 5MB.');
    }

    // Extrai o nome do arquivo e a extensão
    const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const extensionMatch = /\.(\w+)$/.exec(filename);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

    const formData = new FormData();

    if (Platform.OS === 'web') {
      // No ambiente web, converte a URI (blob: ou data:) em Blob nativo e valida o tamanho
      const res = await fetch(localUri);
      const blob = await res.blob();
      if (blob.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error('A imagem selecionada excede o limite máximo permitido de 5MB.');
      }
      formData.append('file', blob, filename);
    } else {
      // No ambiente nativo (Android/iOS), envia o objeto com uri, name e type
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: mimeType,
      });
    }

    // No Web, deixar Content-Type indefinido para que o navegador gere o boundary automaticamente
    const headers = Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' };

    const response = await api.post('/upload', formData, {
      headers,
    });

    return response.data;
  },

  /**
   * Converte um caminho relativo retornado pela API (/uploads/uuid.jpg) em uma URL acessível completa
   * @param {string} imagePath - Caminho ou URL da imagem
   * @returns {string|null}
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
};

export default uploadService;
