import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Preencha o e-mail e a senha para acessar.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabeçalho da Marca */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandIcon}>🎬</Text>
          <Text style={styles.brandTitle}>CaseTrack</Text>
          <Text style={styles.brandSubtitle}>
            Gestão Audiovisual • Inventário • Produções
          </Text>
        </View>

        {/* Card do Formulário de Login */}
        <Card style={styles.loginCard}>
          <Text style={styles.formTitle}>Acessar Plataforma</Text>
          <Text style={styles.formSubtitle}>
            Entre com suas credenciais para continuar
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          <CustomInput
            label="E-mail profissional"
            placeholder="ex: admin@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <CustomInput
            label="Senha de acesso"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage('');
            }}
            secureTextEntry
          />

          <CustomButton
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitButton}
          />
        </Card>

        {/* Bloco de Demonstração Rápida */}
        <Card style={styles.demoCard}>
          <Text style={styles.demoHeading}>ℹ️ Contas de Demonstração</Text>
          <Text style={styles.demoSubtext}>
            Toque em um dos perfis abaixo para preencher automaticamente:
          </Text>

          <View style={styles.quickFillRow}>
            <TouchableOpacity
              style={styles.demoBadgeAdmin}
              onPress={() => fillCredentials('admin@example.com', 'admin123')}
              activeOpacity={0.8}
            >
              <Text style={styles.demoBadgeTitleAdmin}>👑 Administrador</Text>
              <Text style={styles.demoBadgeCredsAdmin}>admin@example.com</Text>
              <Text style={styles.demoBadgeRoleText}>Acesso Total (CRUD + Produções)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBadgeUser}
              onPress={() => fillCredentials('freelancer@example.com', 'user123')}
              activeOpacity={0.8}
            >
              <Text style={styles.demoBadgeTitleUser}>👤 Freelancer / Operador</Text>
              <Text style={styles.demoBadgeCredsUser}>freelancer@example.com</Text>
              <Text style={styles.demoBadgeRoleText}>Apenas Consulta + Avarias</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0F172A', // Navy Dark Background
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    marginTop: 12,
  },
  demoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  demoHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  demoSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  quickFillRow: {
    flexDirection: 'column',
    gap: 10,
  },
  demoBadgeAdmin: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  demoBadgeTitleAdmin: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
  },
  demoBadgeCredsAdmin: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  demoBadgeUser: {
    backgroundColor: '#1E293B',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  demoBadgeTitleUser: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  demoBadgeCredsUser: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  demoBadgeRoleText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});
