import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import ImageZoomModal from '../components/ImageZoomModal';
import equipmentService from '../services/equipmentService';
import damageService from '../services/damageService';
import showAlert from '../utils/alert';

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DamageFormScreen({ navigation, route }) {
  const preSelectedEquipment = route.params?.equipment;

  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    preSelectedEquipment?.id || '',
  );

  // Controle do Dropdown Modal de Seleção de Equipamento com Busca
  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // Array de { uri, fileSize, id }

  // Modal de Zoom de Imagens
  const [zoomModalData, setZoomModalData] = useState({
    visible: false,
    images: [],
    initialIndex: 0,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Carrega lista de equipamentos para seleção caso não tenha vindo pré-selecionado
  useEffect(() => {
    async function fetchEquipments() {
      setLoadingEquipments(true);
      try {
        const data = await equipmentService.list();
        setEquipments(Array.isArray(data) ? data : []);
        if (!selectedEquipmentId && data?.length > 0) {
          setSelectedEquipmentId(data[0].id);
        }
      } catch (err) {
        showAlert('Aviso', 'Não foi possível carregar a lista de equipamentos.');
      } finally {
        setLoadingEquipments(false);
      }
    }

    if (!preSelectedEquipment) {
      fetchEquipments();
    }
  }, [preSelectedEquipment, selectedEquipmentId]);

  // Equipamento selecionado atualmente
  const currentEquipment = useMemo(() => {
    if (preSelectedEquipment) return preSelectedEquipment;
    return equipments.find((item) => String(item.id) === String(selectedEquipmentId)) || null;
  }, [preSelectedEquipment, equipments, selectedEquipmentId]);

  // Lista filtrada para o Dropdown Modal com busca em tempo real
  const filteredEquipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return equipments;
    return equipments.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(q);
      const serialMatch = item.serialNumber?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      return nameMatch || serialMatch || descMatch;
    });
  }, [equipments, searchQuery]);

  const validate = () => {
    const newErrors = {};

    if (!selectedEquipmentId) {
      newErrors.equipment = 'Selecione o equipamento avariado.';
    }

    if (!description.trim()) {
      newErrors.description = 'A descrição do dano é obrigatória.';
    } else if (description.trim().length < 5) {
      newErrors.description = 'A descrição deve ter pelo menos 5 caracteres.';
    }

    if (photos.length === 0) {
      newErrors.photos = 'Pelo menos uma foto de evidência é obrigatória.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) {
      showAlert('Limite atingido', `Você já anexou o número máximo de ${MAX_PHOTOS} fotos.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permissão necessária',
          'É necessário conceder acesso à galeria para anexar fotos de avaria.',
        );
        return;
      }

      // Qualidade 0.8 balanceia nitidez pericial de alta resolução e tamanho leve (< 2MB)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        
        // Medição precisa do tamanho real do arquivo
        let actualSize = asset.fileSize;
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(asset.uri);
            const blob = await res.blob();
            actualSize = blob.size;
          } catch (_) {}
        }

        if (actualSize && actualSize > MAX_FILE_SIZE) {
          const mb = (actualSize / (1024 * 1024)).toFixed(1);
          showAlert(
            'Arquivo muito grande',
            `A imagem selecionada possui ${mb}MB e excede o limite máximo permitido de 5MB para laudos de avaria.`,
          );
          return;
        }

        setPhotos((prev) => [
          ...prev,
          {
            uri: asset.uri,
            fileName: asset.fileName || null,
            fileSize: actualSize || null,
            id: String(Date.now() + Math.random()),
          },
        ]);

        if (errors.photos) setErrors((prev) => ({ ...prev, photos: null }));
      }
    } catch (err) {
      showAlert('Erro', 'Não foi possível acessar a galeria de fotos.');
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      showAlert('Limite atingido', `Você já anexou o número máximo de ${MAX_PHOTOS} fotos.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permissão necessária',
          'É necessário conceder acesso à câmera para fotografar o dano.',
        );
        return;
      }

      // Qualidade 0.8 balanceia nitidez pericial e tamanho leve (< 2MB)
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];

        // Medição precisa do tamanho real do arquivo
        let actualSize = asset.fileSize;
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(asset.uri);
            const blob = await res.blob();
            actualSize = blob.size;
          } catch (_) {}
        }

        if (actualSize && actualSize > MAX_FILE_SIZE) {
          const mb = (actualSize / (1024 * 1024)).toFixed(1);
          showAlert(
            'Arquivo muito grande',
            `A foto capturada possui ${mb}MB e excede o limite máximo de 5MB. Ajuste a resolução.`,
          );
          return;
        }

        setPhotos((prev) => [
          ...prev,
          {
            uri: asset.uri,
            fileName: asset.fileName || null,
            fileSize: actualSize || null,
            id: String(Date.now() + Math.random()),
          },
        ]);

        if (errors.photos) setErrors((prev) => ({ ...prev, photos: null }));
      }
    } catch (err) {
      showAlert('Erro', 'Não foi possível inicializar a câmera.');
    }
  };

  const handleRemovePhoto = (idToRemove) => {
    setPhotos((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const openPhotoZoom = (index) => {
    setZoomModalData({
      visible: true,
      images: photos.map((p, idx) => ({
        uri: p.uri,
        title: `Evidência ${idx + 1} de ${photos.length}`,
        subtitle: currentEquipment?.name || 'Equipamento Avariado',
      })),
      initialIndex: index,
    });
  };

  const handleSubmit = async () => {
    if (!validate()) {
      if (!selectedEquipmentId) {
        showAlert('Equipamento obrigatório', 'Por favor, selecione o equipamento avariado.');
      } else if (!description.trim() || description.trim().length < 5) {
        showAlert(
          'Descrição obrigatória',
          'Por favor, descreva a avaria com pelo menos 5 caracteres.',
        );
      } else if (photos.length === 0) {
        showAlert(
          'Foto obrigatória',
          'Pelo menos uma foto da avaria é obrigatória como evidência pericial.',
        );
      }
      return;
    }

    setSubmitting(true);
    try {
      const createdDamage = await damageService.create({
        photos: photos.map((p) => ({
          uri: p.uri,
          fileName: p.fileName,
          fileSize: p.fileSize,
        })),
        equipmentId: selectedEquipmentId,
        description: description.trim(),
      });

      // Atualiza opcionalmente o status do equipamento para MANUTENCAO
      try {
        await equipmentService.update(selectedEquipmentId, {
          status: 'MANUTENCAO',
        });
      } catch (e) {
        // Ignora se perfil não tiver permissão de update no equipamento
      }

      if (route.params?.returnScreen) {
        showAlert(
          'Avaria Registrada',
          `O laudo de avaria e ${photos.length} evidência(s) fotográfica(s) foram salvos com sucesso.`,
          [
            {
              text: 'Continuar Movimentação',
              onPress: () => {
                navigation.navigate(route.params.returnScreen, {
                  damageId: String(createdDamage?.id || ''),
                  equipmentId: selectedEquipmentId,
                  ...(route.params.returnParams || {}),
                });
              },
            },
          ],
        );
        return;
      }

      showAlert(
        'Avaria Registrada',
        `O laudo de avaria e ${photos.length} evidência(s) fotográfica(s) foram salvos com sucesso no sistema.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Não foi possível salvar o laudo de avaria.';
      showAlert(
        'Erro ao registrar avaria',
        Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Registrar Avaria</Text>
          <Text style={styles.subtitle}>
            Documente danos físicos com menu de seleção rápida e até {MAX_PHOTOS} evidências fotográficas
          </Text>

          {/* Seleção do Equipamento via Dropdown Modal com Busca */}
          <Text style={styles.label}>Equipamento Avariado *</Text>
          {preSelectedEquipment ? (
            <View style={styles.preSelectedBox}>
              <View style={styles.preSelectedInfo}>
                <Text style={styles.preSelectedName}>{preSelectedEquipment.name}</Text>
                {preSelectedEquipment.serialNumber ? (
                  <Text style={styles.preSelectedSerial}>
                    S/N: {preSelectedEquipment.serialNumber}
                  </Text>
                ) : null}
              </View>
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>🔒 Vinculado</Text>
              </View>
            </View>
          ) : loadingEquipments ? (
            <ActivityIndicator size="small" color="#1E3A8A" style={styles.loadingSpinner} />
          ) : (
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                errors.equipment && styles.dropdownTriggerError,
              ]}
              onPress={() => setSelectorModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownTriggerContent}>
                <Text style={styles.dropdownTriggerIcon}>📦</Text>
                <View style={styles.dropdownTriggerTextWrapper}>
                  {currentEquipment ? (
                    <>
                      <Text style={styles.dropdownSelectedTitle} numberOfLines={1}>
                        {currentEquipment.name}
                      </Text>
                      <Text style={styles.dropdownSelectedSerial} numberOfLines={1}>
                        S/N: {currentEquipment.serialNumber || 'Não informado'} • Status:{' '}
                        {currentEquipment.status || 'Ativo'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>
                      Selecione um equipamento do acervo...
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.dropdownChevron}>▾</Text>
            </TouchableOpacity>
          )}

          {errors.equipment ? (
            <Text style={styles.errorText}>{errors.equipment}</Text>
          ) : null}

          {/* Descrição do Dano */}
          <CustomInput
            label="Descrição Detalhada do Dano *"
            placeholder="Ex: Conector HDMI frouxo, lente frontal com risco superficial, rosca travada..."
            value={description}
            onChangeText={(val) => {
              setDescription(val);
              if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
            }}
            multiline
            numberOfLines={4}
            style={styles.multilineInput}
            error={errors.description}
          />

          {/* Seção de Fotos (Até 4 Fotos) */}
          <View style={styles.photoHeaderRow}>
            <Text style={styles.label}>Evidências Fotográficas *</Text>
            <Text style={styles.photoCounter}>
              {photos.length} de {MAX_PHOTOS} anexadas
            </Text>
          </View>
          {errors.photos ? <Text style={styles.errorText}>{errors.photos}</Text> : null}

          {/* Grid de Miniaturas com Remoção e Toque para Zoom */}
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((item, index) => (
                <View key={item.id} style={styles.photoGridItem}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openPhotoZoom(index)}
                    style={styles.photoThumbContainer}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.photoThumb}
                      resizeMode="contain"
                    />
                    <View style={styles.photoZoomOverlay}>
                      <Text style={styles.photoZoomText}>🔍 Foto {index + 1}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => handleRemovePhoto(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={submitting}
                  >
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPhotoBox}>
              <Text style={styles.emptyPhotoIcon}>📸</Text>
              <Text style={styles.emptyPhotoTitle}>Nenhuma evidência anexada</Text>
              <Text style={styles.emptyPhotoSubtitle}>
                Adicione até 4 fotos nítidas para comprovação pericial da avaria
              </Text>
            </View>
          )}

          {/* Botões de Ação para Captura de Fotos */}
          {photos.length < MAX_PHOTOS && (
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickFromGallery}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.photoActionText}>🖼️ Adicionar da Galeria</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handleTakePhoto}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.photoActionText}>📷 Tirar Foto</Text>
              </TouchableOpacity>
            </View>
          )}

          <CustomButton
            title={submitting ? 'Salvando Laudo...' : 'Registrar Avaria'}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>

      {/* Modal Dropdown de Seleção de Equipamento com Busca em Tempo Real */}
      <Modal
        visible={selectorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorModalVisible(false)}
      >
        <View style={styles.selectorModalBackdrop}>
          <View style={styles.selectorModalContent}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>Selecionar Equipamento</Text>
              <TouchableOpacity
                onPress={() => setSelectorModalVisible(false)}
                style={styles.selectorModalCloseBtn}
              >
                <Text style={styles.selectorModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Campo de Busca em Tempo Real */}
            <View style={styles.selectorSearchBox}>
              <Text style={styles.selectorSearchIcon}>🔍</Text>
              <TextInput
                style={styles.selectorSearchInput}
                placeholder="Buscar por nome, S/N ou modelo..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearchBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de Equipamentos */}
            <FlatList
              data={filteredEquipments}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.selectorListContent}
              renderItem={({ item }) => {
                const isSelected = String(selectedEquipmentId) === String(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.selectorItemRow,
                      isSelected && styles.selectorItemRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedEquipmentId(item.id);
                      if (errors.equipment) {
                        setErrors((prev) => ({ ...prev, equipment: null }));
                      }
                      setSelectorModalVisible(false);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectorItemInfo}>
                      <Text style={styles.selectorItemName}>{item.name}</Text>
                      <Text style={styles.selectorItemSerial}>
                        S/N: {item.serialNumber || 'Não informado'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.selectorItemBadge,
                        item.status === 'DISPONIVEL'
                          ? styles.badgeDisponivel
                          : styles.badgeOutro,
                      ]}
                    >
                      <Text style={styles.selectorItemBadgeText}>{item.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.selectorEmptyBox}>
                  <Text style={styles.selectorEmptyText}>
                    Nenhum equipamento corresponde aos termos da busca.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Visualizador Avançado de Zoom de Fotos */}
      <ImageZoomModal
        visible={zoomModalData.visible}
        images={zoomModalData.images}
        initialIndex={zoomModalData.initialIndex}
        onClose={() => setZoomModalData((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  loadingSpinner: {
    marginVertical: 12,
  },
  preSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  preSelectedInfo: {
    flex: 1,
  },
  preSelectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  preSelectedSerial: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  lockedBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  // Dropdown Trigger
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownTriggerError: {
    borderColor: '#EF4444',
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  dropdownTriggerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  dropdownTriggerTextWrapper: {
    flex: 1,
  },
  dropdownSelectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSelectedSerial: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
  },
  dropdownChevron: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },

  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },

  // Seção de Fotos
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  photoGridItem: {
    width: '47%',
    height: 125,
    borderRadius: 10,
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  photoThumbContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoZoomOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoZoomText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoRemoveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyPhotoBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPhotoIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyPhotoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyPhotoSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  photoActionText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    marginTop: 6,
  },

  // Modal Dropdown com Busca
  selectorModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  selectorModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  selectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectorModalCloseBtn: {
    padding: 6,
  },
  selectorModalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
  },
  selectorSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  selectorSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  selectorSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearchBtnText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  selectorListContent: {
    paddingBottom: 24,
  },
  selectorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectorItemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  selectorItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectorItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectorItemSerial: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  selectorItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDisponivel: {
    backgroundColor: '#DCFCE7',
  },
  badgeOutro: {
    backgroundColor: '#FEF3C7',
  },
  selectorItemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectorEmptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  selectorEmptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
});
