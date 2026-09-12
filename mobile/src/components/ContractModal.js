import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import CustomButton from './CustomButton';
import CustomInput from './CustomInput';
import StatusBadge from './StatusBadge';
import { COLORS, RADIUS, SPACING } from '../utils/theme';
import showAlert from '../utils/alert';

export default function ContractModal({
  visible,
  contract,
  onClose,
  onSign,
  onGenerate,
  pdfUrl,
  loading = false,
}) {
  const [signerName, setSignerName] = useState('');
  const [signerDocument, setSignerDocument] = useState('');
  const [submittingSign, setSubmittingSign] = useState(false);

  const handleOpenPdf = () => {
    if (!pdfUrl) {
      showAlert('Aviso', 'O link para o arquivo PDF não está disponível.');
      return;
    }
    Linking.openURL(pdfUrl).catch(() => {
      showAlert('Erro', 'Não foi possível abrir o navegador ou visualizador de PDF.');
    });
  };

  const handleSubmitSign = async () => {
    if (!signerName.trim() || signerName.trim().length < 3) {
      showAlert('Atenção', 'Informe o nome completo do signatário (mín. 3 letras).');
      return;
    }
    if (!signerDocument.trim() || signerDocument.trim().length < 5) {
      showAlert('Atenção', 'Informe o CPF, RG ou documento válido (mín. 5 caracteres).');
      return;
    }

    setSubmittingSign(true);
    try {
      await onSign({
        signerName: signerName.trim(),
        signerDocument: signerDocument.trim(),
      });
      setSignerName('');
      setSignerDocument('');
    } catch (err) {
      // erro tratado no chamador
    } finally {
      setSubmittingSign(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Cabeçalho */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>📄 Termo de Cessão & Locação</Text>
              <Text style={styles.modalSubtitle}>Documento Jurídico de Responsabilidade</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={COLORS.brand.primary} />
                <Text style={styles.loadingText}>Carregando termo...</Text>
              </View>
            ) : !contract ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>Nenhum termo emitido ainda</Text>
                <Text style={styles.emptyText}>
                  Gere o termo em PDF consolidando todos os equipamentos alocados para formalizar a
                  responsabilidade dos operadores.
                </Text>
                <CustomButton
                  title="Emitir Termo de Responsabilidade"
                  onPress={onGenerate}
                  style={styles.primaryBtn}
                />
              </View>
            ) : (
              <View>
                {/* Status e Metadados do Contrato */}
                <View style={styles.statusSection}>
                  <View style={styles.statusRow}>
                    <Text style={styles.contractCode}>TERMO Nº CT-{contract.id}</Text>
                    <StatusBadge status={contract.status} size="small" />
                  </View>

                  <Text style={styles.metaText}>
                    📅 Emitido em:{' '}
                    {new Date(contract.emitido_em).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>

                  {contract.terms_summary ? (
                    <Text style={styles.summaryText}>{contract.terms_summary}</Text>
                  ) : null}
                </View>

                {/* Botão de Visualização do PDF */}
                <TouchableOpacity style={styles.pdfCardBtn} onPress={handleOpenPdf}>
                  <Text style={styles.pdfIcon}>📑</Text>
                  <View style={styles.pdfTextContainer}>
                    <Text style={styles.pdfTitle}>Visualizar Documento PDF</Text>
                    <Text style={styles.pdfSubtitle}>Abrir no leitor de PDF do sistema</Text>
                  </View>
                  <Text style={styles.pdfArrow}>→</Text>
                </TouchableOpacity>

                {/* Se já estiver assinado */}
                {contract.status === 'SIGNED' ? (
                  <View style={styles.signedBox}>
                    <Text style={styles.signedTitle}>✓ Assinado Digitalmente</Text>
                    <Text style={styles.signedItem}>
                      Signatário: <Text style={styles.bold}>{contract.signer_name}</Text>
                    </Text>
                    <Text style={styles.signedItem}>
                      Documento: <Text style={styles.bold}>{contract.signer_document}</Text>
                    </Text>
                    {contract.signed_at && (
                      <Text style={styles.signedItem}>
                        Data:{' '}
                        {new Date(contract.signed_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                ) : (
                  /* Formulário de Assinatura Digital */
                  <View style={styles.signSection}>
                    <Text style={styles.signSectionTitle}>✍️ Assinatura Digital / Aceite</Text>
                    <Text style={styles.signDisclaimer}>
                      O signatário declara ter conferido os números de série e aceita a responsabilidade
                      civil pelos itens disponibilizados.
                    </Text>

                    <CustomInput
                      label="Nome Completo do Responsável"
                      placeholder="Ex: Carlos Eduardo Mendes"
                      value={signerName}
                      onChangeText={setSignerName}
                    />

                    <CustomInput
                      label="CPF ou RG"
                      placeholder="Ex: 123.456.789-00"
                      value={signerDocument}
                      onChangeText={setSignerDocument}
                    />

                    <CustomButton
                      title="Assinar Termo de Responsabilidade"
                      onPress={handleSubmitSign}
                      loading={submittingSign}
                      style={styles.signBtn}
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  scrollBody: {
    marginTop: SPACING.xs,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  centerBox: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    minWidth: 220,
  },
  statusSection: {
    backgroundColor: '#1E293B',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contractCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  pdfCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginBottom: SPACING.lg,
  },
  pdfIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  pdfTextContainer: {
    flex: 1,
  },
  pdfTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
  },
  pdfSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  pdfArrow: {
    fontSize: 18,
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  signedBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  signedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  signedItem: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  signSection: {
    backgroundColor: '#1E293B',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  signDisclaimer: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: SPACING.md,
    lineHeight: 15,
  },
  signBtn: {
    marginTop: SPACING.xs,
    backgroundColor: '#059669',
  },
});
