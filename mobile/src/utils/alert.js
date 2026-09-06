import { Alert, Platform } from 'react-native';

/**
 * Utilitário universal de exibição de alertas multiplataforma (Web, Android, iOS).
 * 
 * Motivação: No react-native-web, o método nativo Alert.alert() é um no-op vazio.
 * Esta função detecta a plataforma e garante que:
 * 1. No Web: exibe diálogos reais (window.alert ou window.confirm) e executa
 *    adequadamente os callbacks de botões (como navigation.goBack() ou exclusão).
 * 2. No Mobile: delega transparentemente para o Alert.alert nativo do React Native.
 * 
 * @param {string} title - Título do alerta
 * @param {string} [message] - Mensagem descritiva
 * @param {Array<{ text?: string, onPress?: () => void, style?: 'default'|'cancel'|'destructive' }>} [buttons] - Lista de ações
 * @param {object} [options] - Opções extras (cancelable, etc.)
 */
export function showAlert(title, message, buttons, options) {
  if (Platform.OS === 'web') {
    const dialogText = [title, message].filter(Boolean).join('\n\n');

    // Caso não haja botões fornecidos ou apenas um botão informativo
    if (!buttons || buttons.length === 0) {
      window.alert(dialogText);
      return;
    }

    // Verifica se é um diálogo de confirmação (possui botão de cancelar + ação positiva)
    const hasCancelButton = buttons.some(
      (b) => b.style === 'cancel' || (b.text && /cancelar|não|nao/i.test(b.text)),
    );

    if (hasCancelButton) {
      const confirmButton = buttons.find(
        (b) => b.style !== 'cancel' && (!b.text || !/cancelar|não|nao/i.test(b.text)),
      );
      const cancelButton = buttons.find(
        (b) => b.style === 'cancel' || (b.text && /cancelar|não|nao/i.test(b.text)),
      );

      const confirmed = window.confirm(dialogText);
      if (confirmed) {
        if (typeof confirmButton?.onPress === 'function') {
          confirmButton.onPress();
        }
      } else {
        if (typeof cancelButton?.onPress === 'function') {
          cancelButton.onPress();
        }
      }
      return;
    }

    // Caso seja apenas um botão de confirmação única (ex: [{ text: 'OK', onPress: () => navigation.goBack() }])
    window.alert(dialogText);
    const primaryButton = buttons[0];
    if (typeof primaryButton?.onPress === 'function') {
      primaryButton.onPress();
    }
  } else {
    Alert.alert(title, message, buttons, options);
  }
}

export default showAlert;
