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
import showAlert from '../utils/alert';

export default function HomeScreen({ navigation }) {
  const { user, logout, isAdmin } = useAuth();
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
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Barra de Perfil e Logout */}
      <View style={styles.userBar}>
        <View style={styles.userInfo}>
          <Text style={styles.greetingText}>Olá, {user?.name || 'Profissional'}!</Text>
          <View
            style={[
              styles.roleBadge,
              isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser,
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                isAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser,
              ]}
            >
              {isAdmin ? '👑 Administrador' : '👤 Freelancer / Operador'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Card de Busca Rápida */}
      <Card style={styles.cardSpacing}>
        <Text style={styles.cardTitle}>Busca de Equipamentos</Text>
        <Text style={styles.cardSubtitle}>Encontre rapidamente itens no acervo</Text>

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
        <Text style={styles.cardTitle}>🎬 Produções Audiovisuais</Text>
        <Text style={styles.cardSubtitle}>Ciclo de 4 etapas, checklists e movimentações</Text>

        <CustomButton
          title="Ver Produções & Etapas"
          onPress={() => navigation.navigate('ProductionList')}
          style={styles.actionButton}
        />

        {isAdmin && (
          <CustomButton
            title="Nova Produção"
            onPress={() => navigation.navigate('ProductionForm')}
            style={[styles.actionButton, styles.primaryActionButton]}
          />
        )}
      </Card>

      {/* Card de Gestão do Acervo */}
      <Card>
        <Text style={styles.cardTitle}>📦 Gestão do Acervo</Text>
        <CustomButton
          title="Listar Equipamentos"
          onPress={() => navigation.navigate('EquipmentList')}
          style={styles.actionButton}
        />

        {isAdmin && (
          <CustomButton
            title="Novo Equipamento"
            onPress={() => navigation.navigate('EquipmentForm')}
            style={styles.actionButton}
          />
        )}

        <CustomButton
          title="Registrar Avaria com Foto"
          onPress={() => navigation.navigate('DamageForm')}
          style={styles.actionButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeAdmin: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  roleBadgeUser: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadgeTextAdmin: {
    color: '#1E40AF',
  },
  roleBadgeTextUser: {
    color: '#065F46',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  cardSpacing: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#4B5563',
    marginBottom: 12,
  },
  primaryActionButton: {
    backgroundColor: '#1E3A8A',
  },
});
