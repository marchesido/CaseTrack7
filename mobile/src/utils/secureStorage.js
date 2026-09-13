import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Utilitário de persistência multiplataforma:
 * - No Android/iOS: utiliza expo-secure-store (armazenamento criptografado no Keystore/Keychain).
 * - Na Web: utiliza localStorage (pois SecureStore depende de subsistema de segurança nativo).
 */
export const secureStorage = {
  /**
   * Recupera um valor armazenado por chave
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch (err) {
        console.warn('[secureStorage] Falha ao ler localStorage na web:', err);
        return null;
      }
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('[secureStorage] Falha ao ler do SecureStore:', err);
      return null;
    }
  },

  /**
   * Grava um valor por chave
   * @param {string} key
   * @param {string} value
   */
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (err) {
        console.warn('[secureStorage] Falha ao gravar no localStorage na web:', err);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('[secureStorage] Falha ao gravar no SecureStore:', err);
    }
  },

  /**
   * Remove uma chave do armazenamento
   * @param {string} key
   */
  async removeItem(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (err) {
        console.warn('[secureStorage] Falha ao remover do localStorage na web:', err);
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('[secureStorage] Falha ao remover do SecureStore:', err);
    }
  },
};

export default secureStorage;
