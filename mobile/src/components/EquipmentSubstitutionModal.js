import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import CustomButton from './CustomButton';
import { COLORS, RADIUS } from '../utils/theme';

export default function EquipmentSubstitutionModal({
  visible,
  onClose,
  substitutePE,
  loadingReplacements,
  availableEquipments,
  selectedReplacementId,
  setSelectedReplacementId,
  substitutionReason,
  setSubstitutionReason,
  submitting,
  onConfirm,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Substituição de Equipamento (Regra B13)</Text>
          <Text style={styles.modalSubtitle}>
            Item avariado: {substitutePE?.equipment?.name} (S/N: {substitutePE?.equipment?.serialNumber || 'N/A'})
          </Text>

          <Text style={styles.inputLabel}>Equipamento Reserva Disponível:</Text>
          {loadingReplacements ? (
            <ActivityIndicator size="small" color={COLORS.brand.primary} style={styles.loader} />
          ) : availableEquipments.length === 0 ? (
            <Text style={styles.noReplacementsText}>
              Nenhum equipamento com status DISPONÍVEL no acervo. Cadastre ou libere um item antes de substituir.
            </Text>
          ) : (
            <ScrollView style={styles.replacementsList} nestedScrollEnabled>
              {availableEquipments.map((eq) => {
                const isSelected = selectedReplacementId === eq.id;
                return (
                  <TouchableOpacity
                    key={eq.id}
                    style={[
                      styles.replacementItem,
                      isSelected && styles.replacementItemSelected,
                    ]}
                    onPress={() => setSelectedReplacementId(eq.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Substituto ${eq.name}`}
                  >
                    <Text
                      style={[
                        styles.replacementItemText,
                        isSelected && styles.replacementItemTextSelected,
                      ]}
                    >
                      {eq.name} (S/N: {eq.serialNumber || 'N/A'})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.inputLabel}>Motivo da Substituição:</Text>
          <TextInput
            style={styles.modalTextInput}
            placeholder="Ex: Substituição emergencial devido à falha na lente durante a inspeção..."
            placeholderTextColor="#94A3B8"
            value={substitutionReason}
            onChangeText={setSubstitutionReason}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Cancelar substituição"
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <CustomButton
              title="Substituir Item"
              onPress={onConfirm}
              loading={submitting}
              disabled={availableEquipments.length === 0}
              style={styles.modalConfirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  loader: {
    marginVertical: 12,
  },
  replacementsList: {
    maxHeight: 140,
    marginBottom: 12,
  },
  replacementItem: {
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  replacementItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  replacementItemText: {
    fontSize: 13,
    color: '#334155',
  },
  replacementItemTextSelected: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  noReplacementsText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 12,
    lineHeight: 16,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    minWidth: 120,
  },
});
