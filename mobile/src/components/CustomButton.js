import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

export default function CustomButton({ title, onPress, disabled, loading, style, textStyle }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        Platform.OS === 'web' && styles.webButton,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1E3A8A', // Blue
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  webButton: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  disabled: {
    backgroundColor: '#9CA3AF', // Gray
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' } : {}),
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
