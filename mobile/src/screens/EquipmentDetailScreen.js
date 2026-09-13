import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import ImageZoomModal from '../components/ImageZoomModal';
import equipmentService from '../services/equipmentService';
import damageService from '../services/damageService';
import uploadService from '../services/uploadService';
import showAlert from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';

export default function EquipmentDetailScreen({ navigation, route }) {
  const { isAdmin } = useAuth();
  const initialEquipment = route.params?.equipment;
  const equipmentId = initialEquipment?.id || route.params?.equipmentId;

  const [equipment, setEquipment] = useState(initialEquipment || null);
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(!initialEquipment);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estado para Modal de Zoom de Imagens (tanto do equipamento quanto das avarias)
  const [previewImage, setPreviewImage] = useState(null);

  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (!equipmentId) {
      setError('Identificador do equipamento não informado.');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else if (!equipment) {
      setLoading(true);
    }
    setError(null);

    try {
      const [eqData, damagesData] = await Promise.all([
        equipmentService.getById(equipmentId),
        damageService.getByEquipmentId(equipmentId),
      ]);

      setEquipment(eqData);
      setDamages(Array.isArray(damagesData) ? damagesData : []);
    } catch (err) {
      setError(err.message || 'Falha ao carregar os detalhes do equipamento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [equipmentId, equipment]);

  // Recarrega sempre que a tela recebe foco (após editar ou registrar avaria)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDetails();
    });
    return unsubscribe;
  }, [navigation, fetchDetails]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISPONIVEL':
        return { label: 'Disponível', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case 'EM_USO':
        return { label: 'Em Uso', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
      case 'MANUTENCAO':
        return { label: 'Em Manutenção', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
      default:
        return { label: status || 'Desconhecido', bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não informada';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Carregando informações do equipamento...</Text>
      </View>
    );
  }

  if (error && !equipment) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erro ao carregar detalhes</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <CustomButton
          title="Tentar Novamente"
          onPress={() => fetchDetails()}
          style={styles.retryButton}
        />
      </View>
    );
  }

  const badge = getStatusBadge(equipment?.status);
  const fullEquipmentImageUrl = uploadService.getFullImageUrl(equipment?.imageUrl);

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDetails(true)}
            colors={['#1E3A8A']}
          />
        }
      >
        {/* Card do Equipamento */}
        <Card style={styles.equipmentCard}>
          {fullEquipmentImageUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                setPreviewImage({
                  uri: fullEquipmentImageUrl,
                  title: equipment.name,
                  subtitle: equipment.serialNumber ? `S/N: ${equipment.serialNumber}` : null,
                })
              }
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: fullEquipmentImageUrl }}
                style={styles.equipmentImage}
                resizeMode="contain"
              />
              <View style={styles.zoomOverlayBadge}>
                <Text style={styles.zoomOverlayText}>🔍 Ver Foto Completa</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderIcon}>🎥</Text>
              <Text style={styles.placeholderText}>Sem foto cadastrada</Text>
            </View>
          )}

          <View style={styles.equipmentInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.equipmentName}>{equipment?.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            {equipment?.serialNumber ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Nº de Série:</Text>
                <Text style={styles.metaValue}>{equipment.serialNumber}</Text>
              </View>
            ) : null}

            {equipment?.description ? (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionHeading}>Descrição do Item</Text>
                <Text style={styles.descriptionContent}>{equipment.description}</Text>
              </View>
            ) : null}

            {equipment?.createdAt ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Cadastrado em:</Text>
                <Text style={styles.metaValueSmall}>{formatDate(equipment.createdAt)}</Text>
              </View>
            ) : null}

            {/* Ações Rápidas do Equipamento */}
            <View style={styles.quickActionsRow}>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editActionBtn]}
                  onPress={() => navigation.navigate('EquipmentForm', { equipment })}
                >
                  <Text style={styles.editActionText}>✏️ Editar Item</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, styles.damageActionBtn]}
                onPress={() => navigation.navigate('DamageForm', { equipment })}
              >
                <Text style={styles.damageActionText}>⚠️ Reportar Avaria</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Seção de Histórico de Avarias */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Histórico de Avarias</Text>
            <View
              style={[
                styles.countBadge,
                damages.length > 0 ? styles.countBadgeAlert : styles.countBadgeOk,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  damages.length > 0 ? styles.countBadgeTextAlert : styles.countBadgeTextOk,
                ]}
              >
                {damages.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addDamageSmallBtn}
            onPress={() => navigation.navigate('DamageForm', { equipment })}
          >
            <Text style={styles.addDamageSmallText}>+ Nova Avaria</Text>
          </TouchableOpacity>
        </View>

        {damages.length === 0 ? (
          <Card style={styles.emptyDamagesCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>Nenhuma avaria registrada</Text>
            <Text style={styles.emptySubtitle}>
              Este equipamento não possui histórico de danos ou avarias registradas e está pronto para uso operacional.
            </Text>
            <CustomButton
              title="Registrar Avaria"
              onPress={() => navigation.navigate('DamageForm', { equipment })}
              style={styles.emptyActionBtn}
            />
          </Card>
        ) : (
          damages.map((damage, index) => {
            const damageImgUrls = damageService.getFullImageUrls(damage.imagem_url);
            return (
              <Card key={damage.id || index} style={styles.damageCard}>
                <View style={styles.damageCardHeader}>
                  <View style={styles.damageIdBadge}>
                    <Text style={styles.damageIdText}>AVARIA #{damage.id || index + 1}</Text>
                  </View>
                  <Text style={styles.damageDateText}>{formatDate(damage.data_registro)}</Text>
                </View>

                {damageImgUrls.length > 0 ? (
                  <View style={styles.damageThumbsRow}>
                    {damageImgUrls.map((imgUrl, imgIdx) => (
                      <TouchableOpacity
                        key={imgIdx}
                        activeOpacity={0.85}
                        onPress={() =>
                          setPreviewImage({
                            images: damageImgUrls.map((u, i) => ({
                              uri: u,
                              title: `Avaria #${damage.id || index + 1} (${i + 1}/${damageImgUrls.length})`,
                              subtitle: damage.descricao,
                            })),
                            initialIndex: imgIdx,
                          })
                        }
                        style={styles.damageThumbContainer}
                      >
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.damageThumbnail}
                          resizeMode="contain"
                        />
                        <View style={styles.zoomIconOverlay}>
                          <Text style={styles.zoomIconText}>🔍</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <View style={styles.damageDetails}>
                  <Text style={styles.damageDescriptionLabel}>Descrição do Dano:</Text>
                  <Text style={styles.damageDescriptionText}>{damage.descricao}</Text>

                  {damage.reportadoPor?.nome || damage.reportadoPor?.name ? (
                    <Text style={styles.reportedByText}>
                      👤 Relatado por: {damage.reportadoPor?.nome || damage.reportadoPor?.name}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Visualizador Avançado de Zoom de Fotos */}
      <ImageZoomModal
        visible={Boolean(previewImage)}
        images={
          previewImage?.images ||
          (previewImage?.uri
            ? [
                {
                  uri: previewImage.uri,
                  title: previewImage.title,
                  subtitle: previewImage.subtitle,
                },
              ]
            : [])
        }
        initialIndex={previewImage?.initialIndex || 0}
        title={previewImage?.title}
        subtitle={previewImage?.subtitle}
        onClose={() => setPreviewImage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    width: 200,
  },

  // Card do Equipamento
  equipmentCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    height: 230,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  equipmentImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  zoomOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  placeholderIcon: {
    fontSize: 42,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  equipmentInfo: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  equipmentName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    lineHeight: 26,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaValueSmall: {
    fontSize: 13,
    color: '#64748B',
  },
  descriptionSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  descriptionContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editActionText: {
    color: '#1E3A8A',
    fontWeight: '600',
    fontSize: 13,
  },
  damageActionBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  damageActionText: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 13,
  },

  // Seção de Avarias
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeAlert: {
    backgroundColor: '#FEF2F2',
  },
  countBadgeOk: {
    backgroundColor: '#ECFDF5',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBadgeTextAlert: {
    color: '#DC2626',
  },
  countBadgeTextOk: {
    color: '#059669',
  },
  addDamageSmallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#1E3A8A',
  },
  addDamageSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State Avarias
  emptyDamagesCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyActionBtn: {
    width: 180,
    backgroundColor: '#1E3A8A',
  },

  // Cards de Avarias
  damageCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  damageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  damageIdBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  damageIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  damageDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  damageThumbsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  damageBodyRow: {
    flexDirection: 'column',
    gap: 8,
  },
  damageThumbContainer: {
    width: 76,
    height: 76,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  damageThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIconText: {
    fontSize: 10,
  },
  damageThumbPlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  damageDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  damageDescriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  damageDescriptionText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    marginBottom: 8,
  },
  reportedByText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Modal Zoom
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalFullImage: {
    width: '100%',
    height: '100%',
  },
});
