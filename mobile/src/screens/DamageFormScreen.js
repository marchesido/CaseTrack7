import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import equipmentService from '../services/equipmentService';
import damageService from '../services/damageService';
import showAlert from '../utils/alert';

export default function DamageFormScreen({ navigation, route }) {
  const preSelectedEquipment = route.params?.equipment;

  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    preSelectedEquipment?.id || '',
  );

  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageFileSize, setImageFileSize] = useState(null);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Carrega a lista de equipamentos caso não venha pré-selecionado
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

    if (!imageUri) {
      newErrors.image = 'A foto da avaria é obrigatória como evidência.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permissão necessária',
          'É necessário conceder acesso à galeria para anexar fotos de avaria.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          showAlert(
            'Arquivo muito grande',
            'A imagem excede o limite máximo permitido de 2MB para laudos de avaria.',
          );
          return;
        }
        setImageUri(asset.uri);
        setImageFileSize(asset.fileSize || null);
        if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
      }
    } catch (err) {
      showAlert('Erro', 'Não foi possível acessar a galeria de fotos.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Permissão necessária',
          'É necessário conceder acesso à câmera para fotografar o dano.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          showAlert(
            'Arquivo muito grande',
            'A foto excede o limite de 2MB. Ajuste o enquadramento.',
          );
          return;
        }
        setImageUri(asset.uri);
        setImageFileSize(asset.fileSize || null);
        if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
      }
    } catch (err) {
      showAlert('Erro', 'Não foi possível inicializar a câmera.');
    }
  };

  const handleRemovePhoto = () => {
    setImageUri(null);
    setImageFileSize(null);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      if (!selectedEquipmentId) {
        showAlert('Equipamento obrigatório', 'Por favor, selecione o equipamento avariado.');
      } else if (!description.trim() || description.trim().length < 5) {
        showAlert('Descrição obrigatória', 'Por favor, descreva a avaria com pelo menos 5 caracteres.');
      } else if (!imageUri) {
        showAlert('Foto obrigatória', 'A foto da avaria é obrigatória como evidência pericial.');
      }
      return;
    }

    setSubmitting(true);
    try {
      const createdDamage = await damageService.create({
        fileUri: imageUri,
        fileSize: imageFileSize,
        equipmentId: selectedEquipmentId,
        description: description.trim(),
      });

      // Atualiza opcionalmente o status do equipamento para MANUTENCAO
      try {
        await equipmentService.update(selectedEquipmentId, {
          status: 'MANUTENCAO',
        });
      } catch (e) {
        // Não impede o sucesso se o usuário não tiver permissão de update no equipamento
      }

      if (route.params?.returnScreen) {
        showAlert(
          'Avaria Registrada',
          'O laudo de avaria e a evidência fotográfica foram salvos com sucesso.',
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
        'O laudo de avaria e a evidência fotográfica foram salvos com sucesso no sistema.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      showAlert(
        'Erro ao registrar avaria',
        err.message || 'Não foi possível salvar o laudo de avaria.',
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
            Documente danos físicos ou mau funcionamento com evidência fotográfica
          </Text>

          {/* Seleção do Equipamento */}
          <Text style={styles.label}>Equipamento Avariado *</Text>
          {preSelectedEquipment ? (
            <View style={styles.preSelectedBox}>
              <Text style={styles.preSelectedName}>{preSelectedEquipment.name}</Text>
              {preSelectedEquipment.serialNumber ? (
                <Text style={styles.preSelectedSerial}>
                  S/N: {preSelectedEquipment.serialNumber}
                </Text>
              ) : null}
            </View>
          ) : loadingEquipments ? (
            <ActivityIndicator size="small" color="#1E3A8A" style={styles.loadingSpinner} />
          ) : (
            <View style={styles.equipmentSelector}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorScroll}
              >
                {equipments.map((item) => {
                  const isSelected = selectedEquipmentId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.equipmentChip,
                        isSelected && styles.equipmentChipSelected,
                      ]}
                      onPress={() => setSelectedEquipmentId(item.id)}
                    >
                      <Text
                        style={[
                          styles.equipmentChipText,
                          isSelected && styles.equipmentChipTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {errors.equipment ? (
            <Text style={styles.errorText}>{errors.equipment}</Text>
          ) : null}

          {/* Descrição do Dano */}
          <CustomInput
            label="Descrição Detalhada do Dano *"
            placeholder="Ex: Lente frontal riscada após queda, rosca do tripé travada..."
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

          {/* Upload de Foto Obrigatória */}
          <Text style={styles.label}>Foto da Avaria (Evidência Obrigatória) *</Text>
          {errors.image ? <Text style={styles.errorText}>{errors.image}</Text> : null}

          <View style={styles.photoContainer}>
            {imageUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handlePickFromGallery}
                    disabled={submitting}
                  >
                    <Text style={styles.photoActionText}>🖼️ Galeria</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handleTakePhoto}
                    disabled={submitting}
                  >
                    <Text style={styles.photoActionText}>📷 Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, styles.removeBtn]}
                    onPress={handleRemovePhoto}
                    disabled={submitting}
                  >
                    <Text style={styles.removeText}>🗑️ Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadIcon}>📸</Text>
                <Text style={styles.uploadTitle}>Fotografe a avaria</Text>
                <Text style={styles.uploadSubtitle}>
                  Limite de 2MB (JPG ou PNG). O registro exige a foto para perícia e garantia.
                </Text>
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.cameraBtn}
                    onPress={handleTakePhoto}
                    disabled={submitting}
                  >
                    <Text style={styles.cameraBtnText}>📷 Tirar Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.galleryBtn}
                    onPress={handlePickFromGallery}
                    disabled={submitting}
                  >
                    <Text style={styles.galleryBtnText}>🖼️ Galeria</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Botões de Ação */}
          <View style={styles.actions}>
            <CustomButton
              title="Salvar Registro de Avaria"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitBtn}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  preSelectedBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  preSelectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  preSelectedSerial: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  loadingSpinner: {
    marginVertical: 12,
  },
  equipmentSelector: {
    marginBottom: 16,
  },
  selectorScroll: {
    gap: 8,
  },
  equipmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  equipmentChipSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  equipmentChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  equipmentChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  photoContainer: {
    marginBottom: 20,
  },
  previewBox: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  photoActionsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  photoActionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  photoActionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  removeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cameraBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  galleryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  galleryBtnText: {
    color: '#1E293B',
    fontWeight: '600',
    fontSize: 13,
  },
  actions: {
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    marginBottom: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
