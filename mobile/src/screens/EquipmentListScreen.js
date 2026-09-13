import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import ImageZoomModal from '../components/ImageZoomModal';
import equipmentService from '../services/equipmentService';
import uploadService from '../services/uploadService';
import showAlert from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const STATUS_TABS = [
  { key: 'ALL', label: 'Todos', activeColor: '#1E3A8A', bgColor: '#EFF6FF', textColor: '#1E3A8A' },
  { key: 'DISPONIVEL', label: 'Disponível', activeColor: '#059669', bgColor: '#ECFDF5', textColor: '#065F46' },
  { key: 'EM_USO', label: 'Em Uso', activeColor: '#D97706', bgColor: '#FFFBEB', textColor: '#92400E' },
  { key: 'MANUTENCAO', label: 'Manutenção', activeColor: '#DC2626', bgColor: '#FEF2F2', textColor: '#991B1B' },
];

export default function EquipmentListScreen({ navigation, route }) {
  const { isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [equipments, setEquipments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estados de Filtro e Busca
  const [searchQuery, setSearchQuery] = useState(route.params?.initialSearch || '');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Estado para Modal de Visualização Ampliada da Foto
  const [previewImage, setPreviewImage] = useState(null);

  // Sincroniza se a rota receber novo initialSearch
  useEffect(() => {
    if (route.params?.initialSearch !== undefined) {
      setSearchQuery(route.params.initialSearch);
    }
  }, [route.params?.initialSearch]);

  const loadEquipments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await equipmentService.list();
      setEquipments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Falha ao carregar a lista de equipamentos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarrega sempre que a tela ganha foco (ao voltar de uma criação ou edição)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEquipments();
    });
    return unsubscribe;
  }, [navigation, loadEquipments]);

  // Contadores por status calculados reativamente
  const statusCounts = useMemo(() => {
    const counts = { ALL: equipments.length, DISPONIVEL: 0, EM_USO: 0, MANUTENCAO: 0 };
    equipments.forEach((item) => {
      if (counts[item.status] !== undefined) {
        counts[item.status] += 1;
      }
    });
    return counts;
  }, [equipments]);

  // Filtro combinado de busca textual e status selecionado
  const filteredEquipments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return equipments.filter((item) => {
      const matchesSearch =
        query === '' ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query));

      const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [equipments, searchQuery, selectedStatus]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
  };

  const isFilterActive = searchQuery.trim().length > 0 || selectedStatus !== 'ALL';

  const handleDelete = (equipment) => {
    showAlert(
      'Confirmar Exclusão',
      `Deseja realmente remover o equipamento "${equipment.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await equipmentService.delete(equipment.id);
              showAlert('Sucesso', 'Equipamento removido com sucesso!');
              loadEquipments();
            } catch (err) {
              showAlert('Erro ao excluir', err.message || 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISPONIVEL':
        return { label: 'Disponível', bg: isDark ? '#065F4644' : '#ECFDF5', color: isDark ? '#6EE7B7' : '#065F46' };
      case 'EM_USO':
        return { label: 'Em Uso', bg: isDark ? '#78350F44' : '#FFFBEB', color: isDark ? '#FCD34D' : '#92400E' };
      case 'MANUTENCAO':
        return { label: 'Manutenção', bg: isDark ? '#7F1D1D44' : '#FEF2F2', color: isDark ? '#FCA5A5' : '#991B1B' };
      default:
        return { label: status || 'Desconhecido', bg: isDark ? '#1E293B' : '#F3F4F6', color: isDark ? '#94A3B8' : '#374151' };
    }
  };

  const renderEquipmentItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const fullImageUrl = uploadService.getFullImageUrl(item.imageUrl);

    return (
      <Card style={styles.card}>
        <View style={styles.cardMainRow}>
          {fullImageUrl ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                setPreviewImage({
                  uri: fullImageUrl,
                  name: item.name,
                  serialNumber: item.serialNumber,
                })
              }
            >
              <Image
                source={{ uri: fullImageUrl }}
                style={styles.thumbnail}
                resizeMode="contain"
              />
              <View style={styles.zoomIconBadge}>
                <Text style={styles.zoomIconText}>🔍</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={styles.placeholderIcon}>🎥</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cardBody}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EquipmentDetail', { equipment: item })}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.equipmentName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            {item.serialNumber ? (
              <Text style={[styles.serialText, { color: colors.textSecondary }]}>S/N: {item.serialNumber}</Text>
            ) : null}

            {item.description ? (
              <Text style={[styles.descriptionText, { color: colors.textMuted }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <Text style={[styles.viewDetailHint, { color: colors.brand.primaryLight }]}>Ver detalhes e avarias ›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.detailBtn, isDark && { backgroundColor: '#1E3A8A33', borderColor: '#1E3A8A' }]}
            onPress={() => navigation.navigate('EquipmentDetail', { equipment: item })}
          >
            <Text style={[styles.detailBtnText, isDark && { color: '#93C5FD' }]}>👁️ Detalhes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.damageBtn, isDark && { backgroundColor: '#78350F33', borderColor: '#B45309' }]}
            onPress={() => navigation.navigate('DamageForm', { equipment: item })}
          >
            <Text style={[styles.damageBtnText, isDark && { color: '#FCD34D' }]}>⚠️ Avaria</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn, isDark && { backgroundColor: '#312E8133', borderColor: '#4338CA' }]}
              onPress={() => navigation.navigate('EquipmentForm', { equipment: item })}
            >
              <Text style={[styles.editBtnText, isDark && { color: '#A5B4FC' }]}>Editar</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn, isDark && { backgroundColor: '#7F1D1D33', borderColor: '#B91C1C' }]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.deleteBtnText, isDark && { color: '#FCA5A5' }]}>Excluir</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de Topo com Total e Botão de Novo */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.totalCount, { color: colors.textSecondary }]}>
          Total: {equipments.length} item(ns)
        </Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('EquipmentForm')}
          >
            <Text style={styles.addButtonText}>+ Novo Item</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barra de Pesquisa */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por nome, S/N ou descrição..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.clearSearchBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chips de Filtro de Status */}
      <View style={[styles.statusChipsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab.key;
          const count = statusCounts[tab.key] || 0;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.statusChip,
                {
                  backgroundColor: isSelected
                    ? (isDark ? tab.activeColor + '33' : tab.bgColor)
                    : (isDark ? colors.surfaceSubtle : '#F8FAFC'),
                  borderColor: isSelected ? tab.activeColor : colors.border,
                },
              ]}
              onPress={() => setSelectedStatus(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: isSelected ? (isDark ? '#F8FAFC' : tab.textColor) : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Linha de Feedback de Resultados e Limpeza */}
      <View style={[styles.feedbackRow, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' }]}>
        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
          Exibindo {filteredEquipments.length} de {equipments.length} equipamentos
        </Text>
        {isFilterActive && (
          <TouchableOpacity onPress={handleClearFilters} style={[styles.clearFiltersBtn, { backgroundColor: colors.border }]}>
            <Text style={[styles.clearFiltersText, { color: colors.textPrimary }]}>Limpar filtros ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Exibição de Erro se houver */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Atenção</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="Tentar Novamente"
            onPress={() => loadEquipments()}
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* Loading ou Lista */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Carregando acervo de equipamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEquipments}
          keyExtractor={(item) => item.id}
          renderItem={renderEquipmentItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadEquipments(true)}
              colors={['#1E3A8A']}
            />
          }
          ListEmptyComponent={
            !error && (
              <View style={styles.emptyContainer}>
                {equipments.length === 0 ? (
                  <>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum equipamento cadastrado</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      Cadastre novos equipamentos para acompanhar o acervo da produtora.
                    </Text>
                    <CustomButton
                      title="Cadastrar Primeiro Equipamento"
                      onPress={() => navigation.navigate('EquipmentForm')}
                      style={styles.emptyButton}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum item encontrado</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      Nenhum equipamento corresponde aos filtros e termos de busca aplicados.
                    </Text>
                    <CustomButton
                      title="Limpar Busca e Filtros"
                      onPress={handleClearFilters}
                      style={styles.emptyButton}
                    />
                  </>
                )}
              </View>
            )
          }
        />
      )}

      {/* Visualizador Avançado de Zoom de Fotos */}
      <ImageZoomModal
        visible={Boolean(previewImage)}
        images={
          previewImage
            ? [
                {
                  uri: previewImage.uri,
                  title: previewImage.name,
                  subtitle: previewImage.serialNumber
                    ? `S/N: ${previewImage.serialNumber}`
                    : null,
                },
              ]
            : []
        }
        title={previewImage?.name}
        subtitle={previewImage?.serialNumber ? `S/N: ${previewImage.serialNumber}` : null}
        onClose={() => setPreviewImage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  addButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchBtn: {
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  clearSearchBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  feedbackText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  clearFiltersBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  clearFiltersText: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  zoomIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  zoomIconText: {
    fontSize: 9,
  },
  thumbnailPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  equipmentName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  serialText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    marginVertical: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  viewDetailHint: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 6,
  },
  detailBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  detailBtnText: {
    color: '#1E3A8A',
    fontWeight: '600',
    fontSize: 13,
  },
  damageBtn: {
    backgroundColor: '#FEF3C7',
  },
  damageBtnText: {
    color: '#92400E',
    fontWeight: '600',
    fontSize: 13,
  },
  editBtn: {
    backgroundColor: '#E0E7FF',
  },
  editBtnText: {
    color: '#3730A3',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    color: '#991B1B',
    fontWeight: '600',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#991B1B',
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    width: 'auto',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleArea: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSerial: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  modalDoneBtn: {
    marginTop: 14,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
