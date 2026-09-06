import React, { useState } from 'react';
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
import uploadService from '../services/uploadService';
import showAlert from '../utils/alert';

const STATUS_OPTIONS = [
  { value: 'DISPONIVEL', label: 'Disponível', activeColor: '#10B981', bgColor: '#ECFDF5' },
  { value: 'EM_USO', label: 'Em Uso', activeColor: '#F59E0B', bgColor: '#FFFBEB' },
  { value: 'MANUTENCAO', label: 'Manutenção', activeColor: '#EF4444', bgColor: '#FEF2F2' },
];

export default function EquipmentFormScreen({ navigation, route }) {
  const existingEquipment = route.params?.equipment;
  const isEditing = Boolean(existingEquipment);

  const [name, setName] = useState(existingEquipment?.name || '');
  const [serialNumber, setSerialNumber] = useState(existingEquipment?.serialNumber || '');
  const [description, setDescription] = useState(existingEquipment?.description || '');
  const [status, setStatus] = useState(existingEquipment?.status || 'DISPONIVEL');

  // Controle de imagem
  const initialImage = existingEquipment?.imageUrl
    ? uploadService.getFullImageUrl(existingEquipment.imageUrl)
    : null;
  const [imageUri, setImageUri] = useState(initialImage);
  const [imageFileSize, setImageFileSize] = useState(null);
  const [isNewImageSelected, setIsNewImageSelected] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'O nome do equipamento é obrigatório.';
    } else if (name.trim().length < 3) {
      newErrors.name = 'O nome deve ter pelo menos 3 caracteres.';
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
          'É necessário conceder acesso à galeria para selecionar imagens de equipamentos.',
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
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showAlert(
            'Arquivo muito grande',
            'A imagem selecionada excede o limite máximo permitido de 5MB. Escolha uma foto menor.',
          );
          return;
        }
        setImageUri(asset.uri);
        setImageFileSize(asset.fileSize || null);
        setIsNewImageSelected(true);
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
          'É necessário conceder acesso à câmera para fotografar equipamentos.',
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
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showAlert(
            'Arquivo muito grande',
            'A foto capturada excede o limite de 5MB. Ajuste a qualidade.',
          );
          return;
        }
        setImageUri(asset.uri);
        setImageFileSize(asset.fileSize || null);
        setIsNewImageSelected(true);
      }
    } catch (err) {
      showAlert('Erro', 'Não foi possível inicializar a câmera.');
    }
  };

  const handleRemovePhoto = () => {
    setImageUri(null);
    setImageFileSize(null);
    setIsNewImageSelected(true);
  };

  const handleSave = async () => {
    if (!validate()) {
      showAlert(
        'Campos obrigatórios',
        'Por favor, preencha o nome do equipamento com pelo menos 3 caracteres antes de salvar.',
      );
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = existingEquipment?.imageUrl || undefined;

      // Se o usuário selecionou uma nova imagem local, realiza o upload primeiro
      if (isNewImageSelected) {
        if (imageUri) {
          setUploadingImage(true);
          const uploadRes = await uploadService.uploadImage(imageUri, imageFileSize);
          finalImageUrl = uploadRes.url;
        } else {
          finalImageUrl = null;
        }
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        status,
        imageUrl: finalImageUrl,
      };

      if (isEditing) {
        await equipmentService.update(existingEquipment.id, payload);
        showAlert('Sucesso', 'Equipamento atualizado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await equipmentService.create(payload);
        showAlert('Sucesso', 'Equipamento cadastrado com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      showAlert(
        'Erro ao salvar',
        error.message || 'Não foi possível salvar o equipamento.',
      );
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>
            {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? 'Atualize as informações do item selecionado'
              : 'Preencha os dados do equipamento para registrá-lo no acervo'}
          </Text>

          {/* Seção de Anexo de Foto */}
          <Text style={styles.label}>Foto do Equipamento</Text>
          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                {uploadingImage && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.uploadOverlayText}>Enviando foto...</Text>
                  </View>
                )}
                <View style={styles.imageActionsRow}>
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePickFromGallery}
                    disabled={loading || uploadingImage}
                  >
                    <Text style={styles.changePhotoText}>🖼️ Galeria</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handleTakePhoto}
                    disabled={loading || uploadingImage}
                  >
                    <Text style={styles.changePhotoText}>📷 Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={handleRemovePhoto}
                    disabled={loading || uploadingImage}
                  >
                    <Text style={styles.removePhotoText}>🗑️ Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noPhotoPlaceholder}>
                <Text style={styles.noPhotoIcon}>📷</Text>
                <Text style={styles.noPhotoTitle}>Nenhuma foto anexada</Text>
                <Text style={styles.noPhotoSubtitle}>
                  Tire uma foto do equipamento ou selecione um arquivo da galeria (PNG/JPG até 5MB)
                </Text>
                <View style={styles.pickerButtonsRow}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={handleTakePhoto}
                    disabled={loading}
                  >
                    <Text style={styles.pickerButtonText}>📷 Tirar Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.galleryButton]}
                    onPress={handlePickFromGallery}
                    disabled={loading}
                  >
                    <Text style={[styles.pickerButtonText, styles.galleryButtonText]}>
                      🖼️ Galeria
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <CustomInput
            label="Nome do Equipamento *"
            placeholder="Ex: Câmera Sony FX3, Lente 24-70mm..."
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
            }}
            error={errors.name}
          />

          <CustomInput
            label="Número de Série (S/N)"
            placeholder="Ex: FX3-8472910"
            value={serialNumber}
            onChangeText={setSerialNumber}
          />

          <CustomInput
            label="Descrição / Observações"
            placeholder="Ex: Acompanha case rígido, 2 baterias e carregador duplo."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.multilineInput}
          />

          <Text style={styles.label}>Status Operacional</Text>
          <View style={styles.statusGroup}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusChip,
                    isSelected && {
                      borderColor: opt.activeColor,
                      backgroundColor: opt.bgColor,
                    },
                  ]}
                  onPress={() => setStatus(opt.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: opt.activeColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      isSelected && { color: opt.activeColor, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.buttonGroup}>
            <CustomButton
              title={
                uploadingImage
                  ? 'Enviando imagem...'
                  : isEditing
                  ? 'Salvar Alterações'
                  : 'Cadastrar Equipamento'
              }
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
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
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  imageSection: {
    marginBottom: 16,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadOverlayText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  imageActionsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  changePhotoButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  changePhotoText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  removePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  removePhotoText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  noPhotoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  noPhotoIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  noPhotoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  noPhotoSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  pickerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  galleryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  galleryButtonText: {
    color: '#1E293B',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  statusGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  buttonGroup: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    marginBottom: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
});

