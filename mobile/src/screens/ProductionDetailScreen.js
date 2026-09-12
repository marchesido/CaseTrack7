import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import StatusBadge from '../components/StatusBadge';
import EquipmentMovementModal from '../components/EquipmentMovementModal';
import EquipmentSubstitutionModal from '../components/EquipmentSubstitutionModal';
import productionService from '../services/productionService';
import equipmentService from '../services/equipmentService';
import googleCalendarService from '../services/googleCalendarService';
import showAlert from '../utils/alert';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

export default function ProductionDetailScreen({ navigation, route }) {
  const productionId = route.params?.id;

  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Aba ativa na tela de detalhe: 'STAGES' | 'CHECKLIST'
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'STAGES');

  // Estado do Modal de Movimentação (Checkout / Checkin)
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [selectedPE, setSelectedPE] = useState(null);
  const [movementType, setMovementType] = useState('checkout'); // 'checkout' | 'checkin'
  const [condition, setCondition] = useState('OK'); // 'OK' | 'DAMAGED'
  const [notes, setNotes] = useState('');
  const [currentDamageId, setCurrentDamageId] = useState(null);
  const [submittingMovement, setSubmittingMovement] = useState(false);

  // Estado do Modal de Substituição (Regra B13)
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const [substitutePE, setSubstitutePE] = useState(null);
  const [availableEquipments, setAvailableEquipments] = useState([]);
  const [selectedReplacementId, setSelectedReplacementId] = useState('');
  const [substitutionReason, setSubstitutionReason] = useState('');
  const [submittingSubstitution, setSubmittingSubstitution] = useState(false);
  const [loadingReplacements, setLoadingReplacements] = useState(false);

  // Estado de andamento de etapa
  const [processingStageId, setProcessingStageId] = useState(null);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // Carrega os detalhes completos da produção
  const loadProduction = useCallback(async (isRefresh = false) => {
    if (!productionId) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await productionService.getById(productionId);
      setProduction(data);
    } catch (err) {
      setError(err.message || 'Falha ao carregar detalhes da produção.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productionId]);

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  // Recarrega ao ganhar foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProduction();
    });
    return unsubscribe;
  }, [navigation, loadProduction]);

  // Se retornou de DamageFormScreen com um damageId para finalizar movimentação
  useEffect(() => {
    if (route.params?.damageId && route.params?.openMovementModalFor && production) {
      const targetPE = production.productionEquipments?.find(
        (pe) => pe.id === route.params.openMovementModalFor,
      );
      if (targetPE) {
        setSelectedPE(targetPE);
        setMovementType(route.params.movementType || 'checkout');
        setCondition('DAMAGED');
        setCurrentDamageId(route.params.damageId);
        setMovementModalVisible(true);
      }
    }
  }, [route.params, production]);

  // Formatação amigável de datas
  const formatDate = (isoString) => {
    if (!isoString) return 'Não definida';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Tratamento de Iniciar Etapa
  const handleStartStage = async (stage) => {
    setProcessingStageId(stage.id);
    try {
      await productionService.startStage(productionId, stage.id);
      showAlert('Etapa Iniciada', `A etapa ${stage.type} agora está em andamento.`);
      loadProduction();
    } catch (err) {
      showAlert('Erro', err.message || 'Não foi possível iniciar a etapa.');
    } finally {
      setProcessingStageId(null);
    }
  };

  // Tratamento de Concluir Etapa
  const handleCompleteStage = async (stage) => {
    // Validação preventiva local caso seja Captação
    if (stage.type === 'CAPTACAO') {
      const activeEquipments = production?.productionEquipments?.filter((pe) => pe.isActive) || [];
      const pendingEquipments = activeEquipments.filter(
        (pe) => pe.movementStatus === 'PENDING_CHECKOUT' || pe.movementStatus === 'INSPECTION_FAILED',
      );

      if (pendingEquipments.length > 0) {
        showAlert(
          'Captação Bloqueada',
          `Existem ${pendingEquipments.length} equipamento(s) ativos pendentes de retirada ou reprovados na inspeção.\n\nTodos os itens devem ser retirados (ou substituídos pelo gestor se avariados) antes de concluir a captação.`,
        );
        return;
      }
    }

    setProcessingStageId(stage.id);
    try {
      await productionService.completeStage(productionId, stage.id);
      showAlert('Etapa Concluída', `A etapa ${stage.type} foi concluída com sucesso!`);
      loadProduction();
    } catch (err) {
      showAlert('Erro ao concluir etapa', err.message || 'Não foi possível concluir a etapa.');
    } finally {
      setProcessingStageId(null);
    }
  };

  // Abertura do Modal de Movimentação
  const openMovementModal = (pe, type) => {
    setSelectedPE(pe);
    setMovementType(type);
    setCondition('OK');
    setNotes('');
    setCurrentDamageId(null);
    setMovementModalVisible(true);
  };

  // Submissão do Checkout ou Checkin
  const handleConfirmMovement = async () => {
    if (!selectedPE) return;

    if (condition === 'DAMAGED' && !currentDamageId) {
      showAlert(
        'Laudo Obrigatório',
        'Para registrar o item como avariado, é obrigatório anexar a foto da avaria.',
      );
      return;
    }

    setSubmittingMovement(true);
    try {
      const payload = {
        condition,
        notes: notes.trim() || undefined,
        damageId: currentDamageId || undefined,
      };

      if (movementType === 'checkout') {
        try {
          await productionService.checkoutEquipment(productionId, selectedPE.id, payload);
          showAlert('Checkout Realizado', 'Equipamento retirado para uso na produção.');
        } catch (err) {
          // Se for 422 de reprovação na inspeção prévia
          if (err.response?.status === 422) {
            showAlert(
              'Inspeção Reprovada',
              'O equipamento foi reprovado na inspeção prévia de saída e enviado para MANUTENÇÃO. Solicite a substituição imediata ao gestor.',
            );
          } else {
            throw err;
          }
        }
      } else {
        await productionService.checkinEquipment(productionId, selectedPE.id, payload);
        showAlert(
          'Devolução Concluída',
          condition === 'OK'
            ? 'Equipamento devolvido e liberado para o acervo!'
            : 'Equipamento devolvido com avaria e encaminhado para manutenção.',
        );
      }

      setMovementModalVisible(false);
      loadProduction();
    } catch (err) {
      showAlert('Erro na Movimentação', err.message || 'Falha ao processar movimentação.');
    } finally {
      setSubmittingMovement(false);
    }
  };

  // Redireciona para DamageFormScreen
  const handleGoToDamageForm = () => {
    if (!selectedPE?.equipment) return;
    setMovementModalVisible(false);
    navigation.navigate('DamageForm', {
      equipment: selectedPE.equipment,
      returnScreen: 'ProductionDetail',
      returnParams: {
        id: productionId,
        openMovementModalFor: selectedPE.id,
        movementType,
      },
    });
  };

  // Abertura do Modal de Substituição B13
  const openSubstituteModal = async (pe) => {
    setSubstitutePE(pe);
    setSubstitutionReason('');
    setSelectedReplacementId('');
    setSubstituteModalVisible(true);
    setLoadingReplacements(true);

    try {
      const list = await equipmentService.list();
      const available = (Array.isArray(list) ? list : []).filter(
        (eq) => eq.status === 'DISPONIVEL' && eq.id !== pe.equipment?.id,
      );
      setAvailableEquipments(available);
      if (available.length > 0) {
        setSelectedReplacementId(available[0].id);
      }
    } catch (err) {
      showAlert('Aviso', 'Não foi possível listar equipamentos disponíveis para substituição.');
    } finally {
      setLoadingReplacements(false);
    }
  };

  // Confirmação da Substituição B13
  const handleConfirmSubstitution = async () => {
    if (!selectedReplacementId) {
      showAlert('Selecione o substituto', 'Por favor, escolha um equipamento disponível.');
      return;
    }
    if (!substitutionReason.trim() || substitutionReason.trim().length < 5) {
      showAlert(
        'Justificativa obrigatória',
        'Informe o motivo da substituição com pelo menos 5 caracteres.',
      );
      return;
    }

    setSubmittingSubstitution(true);
    try {
      await productionService.substituteEquipment(productionId, substitutePE.id, {
        replacementEquipmentId: selectedReplacementId,
        reason: substitutionReason.trim(),
      });

      showAlert(
        'Equipamento Substituído (Regra B13)',
        'O item foi substituído no projeto com sucesso. O histórico anterior foi preservado e o fluxo operacional foi desbloqueado!',
      );
      setSubstituteModalVisible(false);
      loadProduction();
    } catch (err) {
      showAlert('Erro na substituição', err.message || 'Não foi possível substituir o equipamento.');
    } finally {
      setSubmittingSubstitution(false);
    }
  };

  // Cancelamento da Produção (ADMIN)
  const handleCancelProduction = () => {
    Alert.alert(
      'Cancelar Produção',
      'Tem certeza de que deseja cancelar esta produção? Esta ação não pode ser desfeita.',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await productionService.delete(productionId);
              showAlert('Produção Cancelada', 'A produção foi cancelada com sucesso.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              showAlert('Erro', err.message || 'Não foi possível cancelar a produção.');
            }
          },
        },
      ],
    );
  };

  // Métricas da etapa de Captação
  const captureMetrics = useMemo(() => {
    if (!production?.productionEquipments) return { total: 0, checkedOut: 0, allReady: false };
    const active = production.productionEquipments.filter((pe) => pe.isActive);
    const checkedOut = active.filter(
      (pe) => pe.movementStatus === 'CHECKED_OUT' || pe.movementStatus === 'RETURNED_OK' || pe.movementStatus === 'RETURNED_DAMAGED',
    );
    return {
      total: active.length,
      checkedOut: checkedOut.length,
      allReady: active.length === 0 || active.length === checkedOut.length,
    };
  }, [production]);

  // Sincronização com o Google Calendar
  const handleSyncGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      await googleCalendarService.syncProduction(productionId);
      showAlert(
        'Agenda Sincronizada! 🎬',
        'A produção e o cronograma de etapas foram atualizados no Google Calendar com sucesso.',
      );
      loadProduction();
    } catch (err) {
      if (err.isGoogleReconnectRequired || err.status === 424) {
        Alert.alert(
          'Reconexão com o Google Necessária',
          'Sua sessão com o Google expirou ou foi revogada. Deseja abrir a página de autorização para reconectar agora?',
          [
            { text: 'Agora não', style: 'cancel' },
            {
              text: 'Reconectar',
              onPress: async () => {
                try {
                  const auth = await googleCalendarService.getAuthUrl();
                  if (auth?.url) {
                    Linking.openURL(auth.url);
                  }
                } catch (authErr) {
                  showAlert('Erro', 'Não foi possível gerar link de autorização.');
                }
              },
            },
          ],
        );
      } else {
        showAlert('Erro de Sincronização', err.message || 'Falha ao sincronizar com o Google Calendar.');
      }
    } finally {
      setSyncingGoogle(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
        <Text style={styles.loadingText}>Carregando detalhes da produção...</Text>
      </View>
    );
  }

  if (error || !production) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Produção não encontrada.'}</Text>
        <CustomButton title="Tentar Novamente" onPress={() => loadProduction()} style={styles.retryBtn} />
      </View>
    );
  }

  const stages = (production.stages || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  const equipments = production.productionEquipments || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadProduction(true)}
          colors={[COLORS.brand.primary]}
        />
      }
    >
      {/* Cabeçalho da Produção */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.productionTitle}>{production.title}</Text>
          <StatusBadge status={production.status || 'SCHEDULED'} size="medium" />
        </View>

        {production.description ? (
          <Text style={styles.productionDesc}>{production.description}</Text>
        ) : null}

        <View style={styles.metaSection}>
          <Text style={styles.metaItem}>📅 Início: {formatDate(production.scheduledAt)}</Text>
          {production.scheduledEndAt && (
            <Text style={styles.metaItem}>🏁 Fim: {formatDate(production.scheduledEndAt)}</Text>
          )}
          <Text style={styles.metaItem}>
            🎬 Equipamentos Ativos: {captureMetrics.total} | Retirados: {captureMetrics.checkedOut}
          </Text>
        </View>

        {production.status !== 'CANCELLED' && production.status !== 'COMPLETED' && (
          <TouchableOpacity onPress={handleCancelProduction} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancelar Produção</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Card de Integração Google Calendar */}
      <Card style={styles.calendarCard}>
        <View style={styles.calendarHeaderRow}>
          <View style={styles.calendarTitleBlock}>
            <Text style={styles.calendarCardTitle}>📅 Google Agenda & Diárias</Text>
            <Text style={styles.calendarCardSubtitle}>
              {production.googleEventId
                ? `Sincronizado em ${formatDate(production.lastSyncedAt)}`
                : 'Não sincronizado com a agenda corporativa'}
            </Text>
          </View>
          <View
            style={[
              styles.syncPill,
              production.googleEventId ? styles.syncPillActive : styles.syncPillInactive,
            ]}
          >
            <Text
              style={[
                styles.syncPillText,
                production.googleEventId ? styles.syncPillTextActive : styles.syncPillTextInactive,
              ]}
            >
              {production.googleEventId ? 'Sincronizado' : 'Pendente'}
            </Text>
          </View>
        </View>

        <CustomButton
          title={production.googleEventId ? 'Atualizar no Google Calendar' : 'Sincronizar no Google Calendar'}
          onPress={handleSyncGoogleCalendar}
          loading={syncingGoogle}
          style={styles.calendarSyncBtn}
        />
      </Card>

      {/* Abas Internas */}
      <View style={styles.innerTabs}>
        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'STAGES' && styles.activeInnerTab]}
          onPress={() => setActiveTab('STAGES')}
        >
          <Text style={[styles.innerTabText, activeTab === 'STAGES' && styles.activeInnerTabText]}>
            Timeline das Etapas ({stages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.innerTab, activeTab === 'CHECKLIST' && styles.activeInnerTab]}
          onPress={() => setActiveTab('CHECKLIST')}
        >
          <Text style={[styles.innerTabText, activeTab === 'CHECKLIST' && styles.activeInnerTabText]}>
            Checklist de Equipamentos ({equipments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo: Timeline de Etapas */}
      {activeTab === 'STAGES' && (
        <View style={styles.stagesContainer}>
          {stages.map((stage, idx) => {
            const isProcessing = processingStageId === stage.id;
            const isCaptacao = stage.type === 'CAPTACAO';

            return (
              <Card key={stage.id} style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <View style={styles.stageNumberContainer}>
                    <Text style={styles.stageNumber}>{idx + 1}</Text>
                  </View>
                  <View style={styles.stageTitleBlock}>
                    <Text style={styles.stageTypeTitle}>{stage.type}</Text>
                    <Text style={styles.stageDates}>
                      {stage.status === 'COMPLETED'
                        ? `Concluída em ${formatDate(stage.completedAt)}`
                        : stage.status === 'IN_PROGRESS'
                        ? `Iniciada em ${formatDate(stage.startedAt)}`
                        : 'Aguardando início'}
                    </Text>
                  </View>
                  <StatusBadge status={stage.status} size="small" />
                </View>

                {/* Validação e métricas na Captação */}
                {isCaptacao && stage.status === 'IN_PROGRESS' && (
                  <View
                    style={[
                      styles.captacaoNotice,
                      captureMetrics.allReady ? styles.captacaoReady : styles.captacaoPending,
                    ]}
                  >
                    <Text style={styles.captacaoNoticeText}>
                      📦 Status de Retirada: {captureMetrics.checkedOut}/{captureMetrics.total} equipamentos retirados
                    </Text>
                    {!captureMetrics.allReady && (
                      <Text style={styles.captacaoWarningSub}>
                        Todos os itens ativos devem ser retirados para liberar a conclusão desta etapa.
                      </Text>
                    )}
                  </View>
                )}

                {/* Botões de Ação Contextual da Etapa */}
                <View style={styles.stageActionRow}>
                  {stage.status === 'PENDING' && (
                    <CustomButton
                      title="Iniciar Etapa"
                      onPress={() => handleStartStage(stage)}
                      loading={isProcessing}
                      style={styles.stageBtn}
                    />
                  )}

                  {stage.status === 'IN_PROGRESS' && (
                    <CustomButton
                      title="Concluir Etapa"
                      onPress={() => handleCompleteStage(stage)}
                      loading={isProcessing}
                      style={[
                        styles.stageBtn,
                        isCaptacao && !captureMetrics.allReady && styles.stageBtnDisabled,
                      ]}
                    />
                  )}

                  {stage.status === 'COMPLETED' && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Etapa Finalizada</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Conteúdo: Checklist de Equipamentos */}
      {activeTab === 'CHECKLIST' && (
        <View style={styles.equipmentsContainer}>
          {equipments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhum equipamento vinculado</Text>
              <Text style={styles.emptySubtitle}>
                Esta produção não possui equipamentos registrados na lista de saída.
              </Text>
            </Card>
          ) : (
            equipments.map((pe) => {
              const eq = pe.equipment || {};
              const isSubstituted = pe.isActive === false;

              return (
                <Card
                  key={pe.id}
                  style={[
                    styles.equipmentCard,
                    isSubstituted && styles.substitutedEquipmentCard,
                  ]}
                >
                  <View style={styles.equipmentCardHeader}>
                    <View style={styles.eqTitleCol}>
                      <Text style={styles.eqName}>{eq.name || 'Equipamento'}</Text>
                      <Text style={styles.eqSerial}>S/N: {eq.serialNumber || 'N/A'}</Text>
                    </View>
                    <StatusBadge status={pe.movementStatus} size="small" />
                  </View>

                  {/* Banner de Item Inativo / Substituído */}
                  {isSubstituted && (
                    <View style={styles.substitutionBanner}>
                      <Text style={styles.substitutionBannerTitle}>
                        🔄 Item Substituído pelo Gestor (Regra B13)
                      </Text>
                      {pe.substitutionReason ? (
                        <Text style={styles.substitutionReasonText}>
                          Motivo: {pe.substitutionReason}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Botões de Ação Operacional */}
                  {!isSubstituted && (
                    <View style={styles.equipmentActionRow}>
                      {pe.movementStatus === 'PENDING_CHECKOUT' && (
                        <CustomButton
                          title="Retirar (Checkout)"
                          onPress={() => openMovementModal(pe, 'checkout')}
                          style={styles.checkoutBtn}
                        />
                      )}

                      {pe.movementStatus === 'CHECKED_OUT' && (
                        <CustomButton
                          title="Devolver (Checkin)"
                          onPress={() => openMovementModal(pe, 'checkin')}
                          style={styles.checkinBtn}
                        />
                      )}

                      {/* Se o item foi reprovado na inspeção ou avariado, exibe botão de Substituição B13 para gestor */}
                      {(pe.movementStatus === 'INSPECTION_FAILED' ||
                        pe.movementStatus === 'RETURNED_DAMAGED') && (
                        <View style={styles.dangerActionCol}>
                          <Text style={styles.dangerAlertText}>
                            ⚠️ Item avariado. Necessita substituição pelo gestor para manter o fluxo operacional.
                          </Text>
                          <CustomButton
                            title="Substituir Item (Regra B13)"
                            onPress={() => openSubstituteModal(pe)}
                            style={styles.substituteBtn}
                          />
                        </View>
                      )}

                      {pe.movementStatus === 'RETURNED_OK' && (
                        <Text style={styles.returnedSuccessText}>
                          ✅ Devolvido em perfeito estado ao acervo
                        </Text>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* Modal de Movimentação (Checkout / Checkin) */}
      <EquipmentMovementModal
        visible={movementModalVisible}
        onClose={() => setMovementModalVisible(false)}
        selectedPE={selectedPE}
        movementType={movementType}
        condition={condition}
        setCondition={setCondition}
        notes={notes}
        setNotes={setNotes}
        currentDamageId={currentDamageId}
        submitting={submittingMovement}
        onConfirm={handleConfirmMovement}
        onGoToDamageForm={handleGoToDamageForm}
      />

      {/* Modal de Substituição B13 (ADMIN) */}
      <EquipmentSubstitutionModal
        visible={substituteModalVisible}
        onClose={() => setSubstituteModalVisible(false)}
        substitutePE={substitutePE}
        loadingReplacements={loadingReplacements}
        availableEquipments={availableEquipments}
        selectedReplacementId={selectedReplacementId}
        setSelectedReplacementId={setSelectedReplacementId}
        substitutionReason={substitutionReason}
        setSubstitutionReason={setSubstitutionReason}
        submitting={submittingSubstitution}
        onConfirm={handleConfirmSubstitution}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 16,
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  productionDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 20,
  },
  metaSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  metaItem: {
    fontSize: 13,
    color: '#334155',
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  innerTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  innerTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeInnerTab: {
    backgroundColor: '#1E3A8A',
  },
  innerTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeInnerTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stagesContainer: {
    gap: 12,
  },
  stageCard: {
    padding: SPACING.md,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stageNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  stageTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  stageTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  stageDates: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  captacaoNotice: {
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  captacaoReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  captacaoPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  captacaoNoticeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400E',
  },
  captacaoWarningSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  stageActionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  stageBtn: {
    width: '100%',
  },
  stageBtnDisabled: {
    opacity: 0.7,
  },
  completedBadge: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  completedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  equipmentsContainer: {
    gap: 12,
  },
  equipmentCard: {
    padding: SPACING.md,
  },
  substitutedEquipmentCard: {
    backgroundColor: '#F8FAFC',
    opacity: 0.75,
  },
  equipmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eqTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  eqName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  eqSerial: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  substitutionBanner: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 6,
    marginBottom: 6,
  },
  substitutionBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
  substitutionReasonText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  equipmentActionRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  checkoutBtn: {
    backgroundColor: '#2563EB',
  },
  checkinBtn: {
    backgroundColor: '#059669',
  },
  dangerActionCol: {
    gap: 8,
  },
  dangerAlertText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  substituteBtn: {
    backgroundColor: '#D97706',
  },
  returnedSuccessText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    minWidth: 160,
  },
  calendarCard: {
    marginBottom: SPACING.md,
    backgroundColor: '#0F172A',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  calendarTitleBlock: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  calendarCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  calendarCardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  syncPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  syncPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  syncPillInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  syncPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncPillTextActive: {
    color: '#10B981',
  },
  syncPillTextInactive: {
    color: '#94A3B8',
  },
  calendarSyncBtn: {
    marginTop: SPACING.xs,
    backgroundColor: '#1E40AF',
  },
});
