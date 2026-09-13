import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import showAlert from '../utils/alert';

export default function HomeScreen({ navigation }) {
  const { user, logout, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('EquipmentList', { initialSearch: search.trim() });
    }, 200);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Deseja realmente sair da sua conta?');
      if (confirmed) {
        logout();
      }
      return;
    }

    Alert.alert(
      'Encerrar Sessão',
      'Deseja realmente sair do CaseTrack?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Barra de Perfil e Logout */}
      <View
        style={[
          styles.userBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.userInfo}>
          <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
            Olá, {user?.name || 'Profissional'}!
          </Text>
          <View
            style={[
              styles.roleBadge,
              isAdmin
                ? { backgroundColor: isDark ? '#1E3A8A44' : '#EFF6FF', borderColor: '#3B82F6' }
                : { backgroundColor: isDark ? '#065F4644' : '#ECFDF5', borderColor: '#10B981' },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                { color: isAdmin ? (isDark ? '#93C5FD' : '#1E40AF') : (isDark ? '#6EE7B7' : '#065F46') },
              ]}
            >
              {isAdmin ? '👑 Administrador' : '👤 Freelancer / Operador'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: isDark ? '#3B1212' : '#FEF2F2',
              borderColor: isDark ? '#7F1D1D' : '#FECACA',
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutButtonText, { color: isDark ? '#F87171' : '#DC2626' }]}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>


      {/* Card de Busca Rápida */}
      <Card style={styles.cardSpacing}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          🔍 Busca de Equipamentos
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Encontre rapidamente itens no acervo
        </Text>

        <CustomInput
          label="Nome ou código do equipamento"
          placeholder="Ex: Câmera RED, Lente 50mm..."
          value={search}
          onChangeText={setSearch}
        />

        <CustomButton
          title="Ver Acervo Completo"
          onPress={handleSearch}
          loading={loading}
        />
      </Card>

      {/* Card de Produções */}
      <Card style={styles.cardSpacing}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          🎬 Produções Audiovisuais
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Ciclo de 4 etapas, checklists e movimentações
        </Text>

        <CustomButton
          title="Ver Produções & Etapas"
          onPress={() => navigation.navigate('ProductionList')}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#4B5563' },
          ]}
        />

        {isAdmin && (
          <CustomButton
            title="Nova Produção"
            onPress={() => navigation.navigate('ProductionForm')}
            style={[styles.actionButton, { backgroundColor: colors.brand.primary }]}
          />
        )}
      </Card>

      {/* Card de Gestão do Acervo */}
      <Card>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          📦 Gestão do Acervo
        </Text>
        <CustomButton
          title="Listar Equipamentos"
          onPress={() => navigation.navigate('EquipmentList')}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#4B5563' },
          ]}
        />

        {isAdmin && (
          <CustomButton
            title="Novo Equipamento"
            onPress={() => navigation.navigate('EquipmentForm')}
            style={[
              styles.actionButton,
              { backgroundColor: isDark ? colors.surfaceSubtle : '#4B5563' },
            ]}
          />
        )}

        <CustomButton
          title="Registrar Avaria com Foto"
          onPress={() => navigation.navigate('DamageForm')}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? colors.surfaceSubtle : '#4B5563' },
          ]}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  cardSpacing: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
});
