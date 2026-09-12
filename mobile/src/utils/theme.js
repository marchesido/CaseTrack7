/**
 * CaseTrack Design System - Tokens e Semântica Visual Audiovisual
 * Especificação alinhada à persona ui-designer e ao ecossistema cinematográfico.
 */

export const COLORS = {
  // Tema Escuro / Slate Tech Audiovisual (Padrão)
  dark: {
    background: '#0B0F17',
    surface: '#151D2A',
    surfaceSubtle: '#1A2436',
    border: '#1E293B',
    borderLight: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },

  // Tema Claro / Slate Neutral
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
  },

  // Cores de Marca & Acentos Cinematográficos
  brand: {
    primary: '#2563EB',      // Cobalt Cine
    primaryDark: '#1E3A8A',  // Deep Navy
    primaryLight: '#3B82F6',
    accentGold: '#F59E0B',   // Tungsten / Iluminação
    accentGoldDark: '#D97706',
    accentCyan: '#06B6D4',   // Electric Lens
    accentCyanDark: '#0891B2',
    accentPurple: '#8B5CF6', // Post-Production Slate
  },

  // Status de Equipamentos
  equipmentStatus: {
    DISPONIVEL: '#10B981', // Emerald
    EM_USO: '#3B82F6',     // Blue
    MANUTENCAO: '#EF4444', // Danger Red
  },

  // Status Operacional da Produção
  productionStatus: {
    SCHEDULED: '#64748B',   // Slate Gray
    IN_PROGRESS: '#2563EB', // Blue Cine
    COMPLETED: '#10B981',   // Emerald Success
    CANCELLED: '#EF4444',   // Danger Red
  },

  // Etapas da Produção Audiovisual
  stages: {
    CAPTACAO: '#F59E0B', // Amber Tungsten
    EDICAO: '#8B5CF6',   // Purple Edit Suite
    BACKUP: '#06B6D4',   // Cyan Storage
    UPLOAD: '#10B981',   // Emerald Cloud
  },

  // Status de Etapa
  stageStatus: {
    PENDING: '#64748B',
    IN_PROGRESS: '#3B82F6',
    COMPLETED: '#10B981',
  },

  // Status de Movimentação e Inspeção
  movementStatus: {
    PENDING_CHECKOUT: '#F59E0B', // Amber - Aguardando Retirada
    CHECKED_OUT: '#2563EB',      // Blue - Retirado / Em Campo
    RETURNED_OK: '#10B981',      // Emerald - Devolvido sem Danos
    RETURNED_DAMAGED: '#EF4444', // Red - Devolvido com Avaria
    INSPECTION_FAILED: '#DC2626',// Carmine Red - Reprovado na Inspeção
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subhead: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
};

/**
 * Mapeamentos de Labels Legíveis em Português
 */
export const STAGE_LABELS = {
  CAPTACAO: 'Captação',
  EDICAO: 'Edição',
  BACKUP: 'Backup',
  UPLOAD: 'Upload Final',
};

export const PRODUCTION_STATUS_LABELS = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const STAGE_STATUS_LABELS = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Execução',
  COMPLETED: 'Concluída',
};

export const MOVEMENT_STATUS_LABELS = {
  PENDING_CHECKOUT: 'Aguardando Retirada',
  CHECKED_OUT: 'Retirado (Em Uso)',
  RETURNED_OK: 'Devolvido (OK)',
  RETURNED_DAMAGED: 'Devolvido c/ Avaria',
  INSPECTION_FAILED: 'Reprovado na Inspeção',
};

export const EQUIPMENT_STATUS_LABELS = {
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em Uso',
  MANUTENCAO: 'Em Manutenção',
};

/**
 * Utilitário para obter a cor correspondente a qualquer status ou etapa
 */
export const getStatusColor = (key) => {
  if (!key) return '#64748B';
  return (
    COLORS.movementStatus[key] ||
    COLORS.stages[key] ||
    COLORS.productionStatus[key] ||
    COLORS.equipmentStatus[key] ||
    COLORS.stageStatus[key] ||
    '#64748B'
  );
};

/**
 * Utilitário para obter o label formatado
 */
export const getStatusLabel = (key) => {
  if (!key) return '';
  return (
    MOVEMENT_STATUS_LABELS[key] ||
    STAGE_LABELS[key] ||
    PRODUCTION_STATUS_LABELS[key] ||
    EQUIPMENT_STATUS_LABELS[key] ||
    STAGE_STATUS_LABELS[key] ||
    key
  );
};
