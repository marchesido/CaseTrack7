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
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

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
      style={[styles.wrapper, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alternador de Tema Superior */}
        <View style={styles.themeToggleRow}>
          <ThemeToggle variant="compact" />
        </View>

        {/* Cabeçalho da Marca */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandIcon}>🎬</Text>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>CaseTrack</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Gestão Audiovisual • Inventário • Produções
          </Text>
        </View>

        {/* Card do Formulário de Login */}
        <Card style={styles.loginCard}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Acessar Plataforma</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            Entre com suas credenciais para continuar
          </Text>

          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? '#3B1212' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }]}>
              <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>⚠️ {errorMessage}</Text>
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
        <Card style={[styles.demoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Text style={[styles.demoHeading, { color: colors.textPrimary }]}>ℹ️ Contas de Demonstração</Text>
          <Text style={[styles.demoSubtext, { color: colors.textSecondary }]}>
            Toque em um dos perfis abaixo para preencher automaticamente:
          </Text>

          <View style={styles.quickFillRow}>
            <TouchableOpacity
              style={[
                styles.demoBadgeAdmin,
                {
                  backgroundColor: isDark ? colors.surface : '#EFF6FF',
                  borderColor: isDark ? '#3B82F6' : '#93C5FD',
                },
              ]}
              onPress={() => fillCredentials('admin@example.com', 'admin123')}
              activeOpacity={0.8}
            >
              <Text style={[styles.demoBadgeTitleAdmin, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>👑 Administrador</Text>
              <Text style={[styles.demoBadgeCredsAdmin, { color: colors.textPrimary }]}>admin@example.com</Text>
              <Text style={[styles.demoBadgeRoleText, { color: colors.textMuted }]}>Acesso Total (CRUD + Produções)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBadgeUser,
                {
                  backgroundColor: isDark ? colors.surface : '#ECFDF5',
                  borderColor: isDark ? '#10B981' : '#A7F3D0',
                },
              ]}
              onPress={() => fillCredentials('freelancer@example.com', 'user123')}
              activeOpacity={0.8}
            >
              <Text style={[styles.demoBadgeTitleUser, { color: isDark ? '#6EE7B7' : '#065F46' }]}>👤 Freelancer / Operador</Text>
              <Text style={[styles.demoBadgeCredsUser, { color: colors.textPrimary }]}>freelancer@example.com</Text>
              <Text style={[styles.demoBadgeRoleText, { color: colors.textMuted }]}>Apenas Consulta + Avarias</Text>
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
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 36,
    paddingBottom: 48,
  },
  themeToggleRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  loginCard: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 12,
  },
  demoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  demoHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  demoSubtext: {
    fontSize: 12,
    marginBottom: 12,
  },
  quickFillRow: {
    flexDirection: 'column',
    gap: 10,
  },
  demoBadgeAdmin: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  demoBadgeTitleAdmin: {
    fontSize: 13,
    fontWeight: '700',
  },
  demoBadgeCredsAdmin: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  demoBadgeUser: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  demoBadgeTitleUser: {
    fontSize: 13,
    fontWeight: '700',
  },
  demoBadgeCredsUser: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  demoBadgeRoleText: {
    fontSize: 11,
    marginTop: 4,
  },
});
