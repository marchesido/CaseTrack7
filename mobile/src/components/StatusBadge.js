import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor, getStatusLabel, RADIUS, TYPOGRAPHY } from '../utils/theme';

/**
 * StatusBadge - Componente reutilizável de badge cinematográfico
 * Suporta etapas (CAPTACAO, EDICAO, BACKUP, UPLOAD),
 * status de produção (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED),
 * status de movimentação (PENDING_CHECKOUT, CHECKED_OUT, RETURNED_OK, RETURNED_DAMAGED, INSPECTION_FAILED),
 * e status de equipamento (DISPONIVEL, EM_USO, MANUTENCAO).
 */
export const StatusBadge = ({
  status,
  customLabel,
  customColor,
  size = 'medium', // 'small' | 'medium' | 'large'
  style,
  textStyle,
}) => {
  const color = customColor || getStatusColor(status);
  const label = customLabel || getStatusLabel(status);

  const sizeStyles = {
    small: styles.smallBadge,
    medium: styles.mediumBadge,
    large: styles.largeBadge,
  }[size] || styles.mediumBadge;

  const textStyles = {
    small: styles.smallText,
    medium: styles.mediumText,
    large: styles.largeText,
  }[size] || styles.mediumText;

  return (
    <View
      style={[
        styles.badgeBase,
        sizeStyles,
        {
          backgroundColor: `${color}1A`, // 10% opacidade no fundo
          borderColor: `${color}66`,     // 40% opacidade na borda
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.textBase,
          textStyles,
          { color: color },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  textBase: {
    ...TYPOGRAPHY.badge,
    textTransform: 'uppercase',
  },
  // Tamanhos
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  smallText: {
    fontSize: 10,
    lineHeight: 12,
  },
  mediumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mediumText: {
    fontSize: 11,
    lineHeight: 14,
  },
  largeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  largeText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default StatusBadge;
