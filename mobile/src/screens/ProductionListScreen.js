import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import StatusBadge from '../components/StatusBadge';
import productionService from '../services/productionService';
import showAlert from '../utils/alert';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Todas' },
  { key: 'SCHEDULED', label: 'Agendadas' },
  { key: 'IN_PROGRESS', label: 'Em Andamento' },
  { key: 'COMPLETED', label: 'Concluídas' },
  { key: 'CANCELLED', label: 'Canceladas' },
];

export default function ProductionListScreen({ navigation }) {
  // Modo de visualização: 'ALL_PRODUCTIONS' | 'MY_PENDING'
  const [activeTab, setActiveTab] = useState('ALL_PRODUCTIONS');

  // Estados de dados
  const [productions, setProductions] = useState([]);
  const [pendingData, setPendingData] = useState({ pendingStages: [], pendingReturns: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estados de busca e filtro de status
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Carrega dados da API
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (activeTab === 'ALL_PRODUCTIONS') {
        const data = await productionService.list();
        setProductions(Array.isArray(data) ? data : []);
      } else {
        const pending = await productionService.getMyPending();
        setPendingData(pending || { pendingStages: [], pendingReturns: [] });
      }
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as produções.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  // Recarrega ao ganhar foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Alterna aba principal e recarrega
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedStatus('ALL');
  };

  // Contadores por status reativos
  const statusCounts = useMemo(() => {
    const counts = { ALL: productions.length, SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    productions.forEach((item) => {
      const st = item.status || 'SCHEDULED';
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
    });
    return counts;
  }, [productions]);

  // Filtro textual e por status
  const filteredProductions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return productions.filter((item) => {
      const matchesSearch =
        query === '' ||
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query));

      const matchesStatus =
        selectedStatus === 'ALL' || (item.status || 'SCHEDULED') === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [productions, searchQuery, selectedStatus]);

  // Formatação amigável de datas
  const formatDate = (isoString) => {
    if (!isoString) return 'Data não definida';
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

  // Renderiza card de produção regular
  const renderProductionCard = ({ item }) => {
    const activeStage = item.stages?.find(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING',
    );
    const eqCount = item.equipments?.filter((e) => e.isActive !== false)?.length || 0;

    return (
      <Card style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductionDetail', { id: item.id, title: item.title })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardDate}>
                📅 {formatDate(item.scheduledAt)}
              </Text>
            </View>
            <StatusBadge status={item.status || 'SCHEDULED'} size="small" />
          </View>

          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.stageIndicator}>
              <Text style={styles.footerLabel}>Etapa Atual:</Text>
              {activeStage ? (
                <StatusBadge status={activeStage.stage} size="small" />
              ) : (
                <Text style={styles.footerMuted}>Finalizada</Text>
              )}
            </View>

            <View style={styles.equipmentIndicator}>
              <Text style={styles.equipmentBadgeText}>
                🎬 {eqCount} {eqCount === 1 ? 'item' : 'itens'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  // Renderiza visualização de Minhas Pendências
  const renderPendingView = () => {
    const stages = pendingData?.pendingStages || [];
    const returns = pendingData?.pendingReturns || [];
    const totalPending = stages.length + returns.length;

    if (totalPending === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Tudo em dia!</Text>
          <Text style={styles.emptySubtitle}>
            Você não possui etapas atribuídas pendentes nem devoluções em aberto.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pendingListContainer}>
        {stages.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              📌 Etapas Atribuídas Pendentes ({stages.length})
            </Text>
            {stages.map((stage) => (
              <Card key={`stage-${stage.id}`} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingProductionTitle}>
                    {stage.production?.title || 'Produção'}
                  </Text>
                  <StatusBadge status={stage.stage} size="small" />
                </View>
                <Text style={styles.pendingSubtitle}>
                  Status: {stage.status === 'IN_PROGRESS' ? 'Em Execução' : 'Aguardando Início'}
                </Text>
                <CustomButton
                  title="Acessar Produção & Checklist"
                  onPress={() =>
                    navigation.navigate('ProductionDetail', {
                      id: stage.production?.id,
                      title: stage.production?.title,
                    })
                  }
                  style={styles.pendingActionButton}
                />
              </Card>
            ))}
          </View>
        )}

        {returns.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitleDanger}>
              ⚠️ Devoluções de Equipamento Pendentes ({returns.length})
            </Text>
            {returns.map((pe) => (
              <Card key={`return-${pe.id}`} style={styles.pendingDangerCard}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingEquipmentName}>
                    {pe.equipment?.name || 'Equipamento'}
                  </Text>
                  <StatusBadge status="CHECKED_OUT" size="small" />
                </View>
                <Text style={styles.pendingSubtitle}>
                  S/N: {pe.equipment?.serialNumber || 'N/A'} • {pe.production?.title || 'Produção'}
                </Text>
                <CustomButton
                  title="Ir para Devolução (Checkin)"
                  onPress={() =>
                    navigation.navigate('ProductionDetail', {
                      id: pe.production?.id,
                      title: pe.production?.title,
                      initialTab: 'CHECKLIST',
                    })
                  }
                  style={styles.pendingDangerActionButton}
                />
              </Card>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Abas Superiores de Alternância */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.topTab, activeTab === 'ALL_PRODUCTIONS' && styles.activeTopTab]}
          onPress={() => handleTabChange('ALL_PRODUCTIONS')}
        >
          <Text
            style={[
              styles.topTabText,
              activeTab === 'ALL_PRODUCTIONS' && styles.activeTopTabText,
            ]}
          >
            Todas as Produções
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'MY_PENDING' && styles.activeTopTab]}
          onPress={() => handleTabChange('MY_PENDING')}
        >
          <Text
            style={[
              styles.topTabText,
              activeTab === 'MY_PENDING' && styles.activeTopTabText,
            ]}
          >
            Minhas Pendências
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Busca e Filtros de Status (Apenas na aba Todas as Produções) */}
      {activeTab === 'ALL_PRODUCTIONS' && (
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por título ou descrição..."
              placeholderTextColor={COLORS.light.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Chips de Status com Contadores */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.statusChipsContainer}
            renderItem={({ item }) => {
              const isSelected = selectedStatus === item.key;
              const count = statusCounts[item.key] || 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    isSelected && styles.activeStatusChip,
                  ]}
                  onPress={() => setSelectedStatus(item.key)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.activeStatusChipText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <View
                    style={[
                      styles.chipCountBadge,
                      isSelected && styles.activeChipCountBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipCountText,
                        isSelected && styles.activeChipCountText,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Conteúdo Principal */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand.primary} />
          <Text style={styles.loadingText}>Carregando produções...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <CustomButton title="Tentar Novamente" onPress={() => loadData()} style={styles.retryBtn} />
        </View>
      ) : activeTab === 'MY_PENDING' ? (
        <FlatList
          data={[1]}
          keyExtractor={() => 'pending-view'}
          renderItem={renderPendingView}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[COLORS.brand.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredProductions}
          keyExtractor={(item) => item.id}
          renderItem={renderProductionCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[COLORS.brand.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>Nenhuma produção encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedStatus !== 'ALL'
                  ? 'Tente ajustar os filtros ou termo de busca.'
                  : 'Cadastre a primeira produção audiovisual da sua produtora.'}
              </Text>
              {searchQuery || selectedStatus !== 'ALL' ? (
                <CustomButton
                  title="Limpar Filtros"
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedStatus('ALL');
                  }}
                  style={styles.emptyCta}
                />
              ) : (
                <CustomButton
                  title="Nova Produção"
                  onPress={() => navigation.navigate('ProductionForm')}
                  style={styles.emptyCta}
                />
              )}
            </View>
          }
        />
      )}

      {/* Botão Flutuante para Cadastrar Nova Produção */}
      {activeTab === 'ALL_PRODUCTIONS' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ProductionForm')}
        >
          <Text style={styles.fabText}>+ Nova Produção</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTopTab: {
    borderBottomColor: COLORS.brand.primary,
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTopTabText: {
    color: COLORS.brand.primary,
    fontWeight: '700',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: SPACING.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusChipsContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeStatusChip: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeStatusChipText: {
    color: '#FFFFFF',
  },
  chipCountBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activeChipCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  activeChipCountText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#64748B',
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  stageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footerMuted: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  equipmentIndicator: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  equipmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyCta: {
    minWidth: 180,
  },
  pendingListContainer: {
    paddingBottom: 24,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
  },
  sectionTitleDanger: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 10,
  },
  pendingCard: {
    marginBottom: 10,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand.primary,
  },
  pendingDangerCard: {
    marginBottom: 10,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pendingProductionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  pendingEquipmentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991B1B',
    flex: 1,
    marginRight: 8,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  pendingActionButton: {
    marginTop: 4,
  },
  pendingDangerActionButton: {
    marginTop: 4,
    backgroundColor: '#DC2626',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: RADIUS.full,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
