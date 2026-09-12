import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import CustomButton from './CustomButton';
import { RADIUS } from '../utils/theme';

export default function EquipmentMovementModal({
  visible,
  onClose,
  selectedPE,
  movementType,
  condition,
  setCondition,
  notes,
  setNotes,
  currentDamageId,
  submitting,
  onConfirm,
  onGoToDamageForm,
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
          <Text style={styles.modalTitle}>
            {movementType === 'checkout'
              ? 'Inspeção de Saída (Checkout)'
              : 'Conferência de Retorno (Checkin)'}
          </Text>

          <Text style={styles.modalSubtitle}>
            {selectedPE?.equipment?.name} (S/N: {selectedPE?.equipment?.serialNumber || 'N/A'})
          </Text>

          {/* Condição do Equipamento */}
          <Text style={styles.inputLabel}>Condição Física:</Text>
          <View style={styles.conditionSelector}>
            <TouchableOpacity
              style={[
                styles.conditionBtn,
                condition === 'OK' && styles.conditionBtnActiveOk,
              ]}
              onPress={() => setCondition('OK')}
              accessibilityRole="radio"
              accessibilityState={{ selected: condition === 'OK' }}
              accessibilityLabel="Perfeito estado OK"
            >
              <Text
                style={[
                  styles.conditionBtnText,
                  condition === 'OK' && styles.conditionBtnTextActive,
                ]}
              >
                ✓ Perfeito Estado (OK)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.conditionBtn,
                condition === 'DAMAGED' && styles.conditionBtnActiveDamaged,
              ]}
              onPress={() => setCondition('DAMAGED')}
              accessibilityRole="radio"
              accessibilityState={{ selected: condition === 'DAMAGED' }}
              accessibilityLabel="Com avaria ou dano"
            >
              <Text
                style={[
                  styles.conditionBtnText,
                  condition === 'DAMAGED' && styles.conditionBtnTextActive,
                ]}
              >
                ⚠️ Com Avaria / Dano
              </Text>
            </TouchableOpacity>
          </View>

          {/* Se marcado como danificado */}
          {condition === 'DAMAGED' && (
            <View style={styles.damagedBlock}>
              {currentDamageId ? (
                <View style={styles.damageConfirmed}>
                  <Text style={styles.damageConfirmedText}>
                    📸 Laudo de avaria vinculado: #{currentDamageId}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.damageNotice}>
                    Para registrar o item danificado, é obrigatório fotografar e registrar a avaria.
                  </Text>
                  <CustomButton
                    title="Capturar Foto & Registrar Avaria"
                    onPress={onGoToDamageForm}
                    style={styles.photoDamageBtn}
                  />
                </View>
              )}
            </View>
          )}

          {/* Observações */}
          <Text style={styles.inputLabel}>Observações (opcional):</Text>
          <TextInput
            style={styles.modalTextInput}
            placeholder="Ex: Lacrado no case original, cabo incluso..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {/* Botões do Modal */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Cancelar movimentação"
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <CustomButton
              title="Confirmar"
              onPress={onConfirm}
              loading={submitting}
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
  conditionSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  conditionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  conditionBtnActiveOk: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  conditionBtnActiveDamaged: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  conditionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  conditionBtnTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  damagedBlock: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  damageNotice: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 8,
  },
  photoDamageBtn: {
    backgroundColor: '#DC2626',
  },
  damageConfirmed: {
    padding: 6,
  },
  damageConfirmedText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
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
