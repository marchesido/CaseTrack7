import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import productionService from '../services/productionService';
import equipmentService from '../services/equipmentService';
import showAlert from '../utils/alert';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

export default function ProductionFormScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  // Datas: guardamos data base e hora de início/término
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0);

  const [dateString, setDateString] = useState(
    defaultStartDate.toISOString().split('T')[0], // YYYY-MM-DD
  );
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Seleção de equipamentos
  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Busca lista de equipamentos disponíveis no acervo
  useEffect(() => {
    async function fetchAvailableEquipments() {
      setLoadingEquipments(true);
      try {
        const data = await equipmentService.list();
        const available = (Array.isArray(data) ? data : []).filter(
          (eq) => eq.status === 'DISPONIVEL',
        );
        setEquipments(available);
      } catch (err) {
        showAlert('Aviso', 'Não foi possível carregar a lista de equipamentos disponíveis.');
      } finally {
        setLoadingEquipments(false);
      }
    }

    fetchAvailableEquipments();
  }, []);

  // Alterna seleção de um equipamento
  const toggleEquipmentSelection = (id) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Filtra equipamentos por termo de busca
  const filteredEquipments = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    if (!q) return equipments;
    return equipments.filter(
      (eq) =>
        (eq.name && eq.name.toLowerCase().includes(q)) ||
        (eq.serialNumber && eq.serialNumber.toLowerCase().includes(q)),
    );
  }, [equipments, equipmentSearch]);

  const setQuickDate = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setDateString(`${yyyy}-${mm}-${dd}`);
    if (errors.date) setErrors((prev) => ({ ...prev, date: null }));
  };

  const setQuickTime = (start, end) => {
    setStartTime(start);
    setEndTime(end);
  };

  const validate = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'O título da produção é obrigatório.';
    } else if (title.trim().length < 3) {
      newErrors.title = 'O título deve ter pelo menos 3 caracteres.';
    }

    if (!dateString.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      newErrors.date = 'Data inválida. Use o formato AAAA-MM-DD (ex: 2026-09-15).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showAlert('Atenção', 'Corrija os campos com erro antes de prosseguir.');
      return;
    }

    setSubmitting(true);
    try {
      // Monta ISO strings
      const scheduledAt = new Date(`${dateString}T${startTime}:00.000Z`).toISOString();
      const scheduledEndAt = new Date(`${dateString}T${endTime}:00.000Z`).toISOString();

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt,
        scheduledEndAt,
        isAllDay,
        equipmentIds: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : undefined,
      };

      const created = await productionService.create(payload);

      showAlert(
        'Produção Criada com Sucesso! 🎬',
        `A produção "${title}" foi criada com as 4 etapas automáticas (Captação, Edição, Backup, Upload) e ${selectedEquipmentIds.length} equipamentos vinculados.`,
        [
          {
            text: 'Ver Detalhes',
            onPress: () => {
              navigation.replace('ProductionDetail', {
                id: created.id,
                title: created.title,
              });
            },
          },
        ],
      );
    } catch (err) {
      showAlert('Erro ao criar produção', err.message || 'Falha ao salvar a produção no servidor.');
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
          <Text style={styles.sectionHeader}>Dados Gerais do Projeto</Text>

          <CustomInput
            label="Título da Produção *"
            placeholder="Ex: Comercial Nova Coleção de Inverno"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
            }}
            error={errors.title}
          />

          <CustomInput
            label="Descrição / Cliente"
            placeholder="Ex: Diária externa no Parque Ibirapuera, cliente ABC"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.dateBlock}>
            {/* Atalhos rápidos de data */}
            <View style={styles.quickDateRow}>
              <Text style={styles.quickDateLabel}>Atalhos rápidos:</Text>
              <TouchableOpacity
                style={styles.quickDateChip}
                onPress={() => setQuickDate(0)}
                accessibilityRole="button"
                accessibilityLabel="Data hoje"
              >
                <Text style={styles.quickDateChipText}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickDateChip}
                onPress={() => setQuickDate(1)}
                accessibilityRole="button"
                accessibilityLabel="Data amanhã"
              >
                <Text style={styles.quickDateChipText}>Amanhã</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickDateChip}
                onPress={() => setQuickDate(7)}
                accessibilityRole="button"
                accessibilityLabel="Data em 7 dias"
              >
                <Text style={styles.quickDateChipText}>+7 dias</Text>
              </TouchableOpacity>
            </View>

            <CustomInput
              label="Data do Agendamento (AAAA-MM-DD) *"
              placeholder="Ex: 2026-09-15"
              value={dateString}
              onChangeText={(text) => {
                setDateString(text);
                if (errors.date) setErrors((prev) => ({ ...prev, date: null }));
              }}
              error={errors.date}
            />

            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <CustomInput
                  label="Início (HH:MM)"
                  placeholder="09:00"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={styles.timeCol}>
                <CustomInput
                  label="Término (HH:MM)"
                  placeholder="18:00"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            {/* Presets rápidos de horário */}
            <View style={styles.quickTimeRow}>
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('08:00', '17:00')}
                accessibilityRole="button"
              >
                <Text style={styles.quickTimeChipText}>08h - 17h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('09:00', '18:00')}
                accessibilityRole="button"
              >
                <Text style={styles.quickTimeChipText}>09h - 18h (Padrão)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('14:00', '22:00')}
                accessibilityRole="button"
              >
                <Text style={styles.quickTimeChipText}>14h - 22h (Noturno)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Produção de dia inteiro (All-Day)</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#CBD5E1', true: COLORS.brand.primary }}
              />
            </View>
          </View>
        </Card>

        {/* Seletor de Equipamentos com Busca e Checkboxes */}
        <Card style={styles.card}>
          <View style={styles.eqHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>Equipamentos Necessários</Text>
              <Text style={styles.sectionSubtitle}>
                Selecione os itens do acervo para o checklist de saída
              </Text>
            </View>
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountText}>
                {selectedEquipmentIds.length} selecionado(s)
              </Text>
            </View>
          </View>

          {/* Campo de busca rápida no acervo */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrar por nome ou número de série..."
              placeholderTextColor="#94A3B8"
              value={equipmentSearch}
              onChangeText={setEquipmentSearch}
            />
            {equipmentSearch !== '' && (
              <TouchableOpacity onPress={() => setEquipmentSearch('')}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingEquipments ? (
            <View style={styles.loadingEquipments}>
              <ActivityIndicator size="small" color={COLORS.brand.primary} />
              <Text style={styles.loadingText}>Carregando acervo disponível...</Text>
            </View>
          ) : filteredEquipments.length === 0 ? (
            <Text style={styles.noEquipmentsText}>
              {equipmentSearch
                ? 'Nenhum equipamento disponível corresponde à busca.'
                : 'Não há equipamentos disponíveis no momento.'}
            </Text>
          ) : (
            <View style={styles.equipmentsList}>
              {filteredEquipments.map((eq) => {
                const isSelected = selectedEquipmentIds.includes(eq.id);
                return (
                  <TouchableOpacity
                    key={eq.id}
                    style={[
                      styles.equipmentRow,
                      isSelected && styles.equipmentRowSelected,
                    ]}
                    onPress={() => toggleEquipmentSelection(eq.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>

                    <View style={styles.eqInfo}>
                      <Text style={styles.eqName}>{eq.name}</Text>
                      <Text style={styles.eqSerial}>S/N: {eq.serialNumber || 'N/A'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Botão de Criação */}
        <CustomButton
          title="Criar Produção Audiovisual"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    marginBottom: 16,
    padding: SPACING.md,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  dateBlock: {
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  quickDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  quickDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  quickDateChip: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  quickTimeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  quickTimeChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickTimeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  eqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectedCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
  },
  loadingEquipments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  noEquipmentsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  equipmentsList: {
    gap: 6,
    maxHeight: 280,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  equipmentRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  eqInfo: {
    flex: 1,
  },
  eqName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  eqSerial: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  submitBtn: {
    marginTop: 8,
  },
});
