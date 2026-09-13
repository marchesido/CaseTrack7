import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const MODE_CONFIG = {
  system: { icon: '⚙️', label: 'Auto', hint: 'Automático (segue o sistema)' },
  light: { icon: '☀️', label: 'Claro', hint: 'Tema Claro fixo' },
  dark: { icon: '🌙', label: 'Escuro', hint: 'Tema Escuro fixo' },
};

/**
 * Componente de Alternância de Tema:
 * - variant="segmented": Exibe os 3 modos (Claro, Escuro, Sistema)
 * - variant="compact" ou "icon": Botão compacto que alterna sequencialmente Auto -> Claro -> Escuro
 */
export default function ThemeToggle({ variant = 'segmented', inHeader = false, style }) {
  const { themeMode, setThemeMode, isDark, cycleThemeMode, colors } = useTheme();

  if (variant === 'compact' || variant === 'icon') {
    const currentMode = MODE_CONFIG[themeMode] || MODE_CONFIG.system;
    const buttonBg = inHeader
      ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)')
      : colors.surfaceSubtle;
    const buttonBorder = inHeader
      ? (isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.35)')
      : colors.border;
    const textColor = inHeader ? '#FFFFFF' : colors.textPrimary;

    return (
      <TouchableOpacity
        style={[
          styles.compactButton,
          {
            backgroundColor: buttonBg,
            borderColor: buttonBorder,
          },
          style,
        ]}
        onPress={cycleThemeMode}
        accessibilityLabel={`Tema atual: ${currentMode.label}. Toque para alternar entre Automático, Claro e Escuro`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text style={styles.compactIcon}>{currentMode.icon}</Text>
        {variant !== 'icon' && (
          <Text style={[styles.compactText, { color: textColor }]}>
            {currentMode.label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Segmented control para os 3 estados
  const options = [
    { mode: 'light', label: '☀️ Claro' },
    { mode: 'dark', label: '🌙 Escuro' },
    { mode: 'system', label: '⚙️ Auto' },
  ];

  return (
    <View
      style={[
        styles.segmentedContainer,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isActive = themeMode === opt.mode;
        return (
          <TouchableOpacity
            key={opt.mode}
            style={[
              styles.segmentItem,
              isActive && [
                styles.segmentItemActive,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  shadowColor: '#000',
                  borderColor: isDark ? colors.borderLight : '#CBD5E1',
                },
              ],
            ]}
            onPress={() => setThemeMode(opt.mode)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isActive ? colors.textPrimary : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 12,
  },
});
