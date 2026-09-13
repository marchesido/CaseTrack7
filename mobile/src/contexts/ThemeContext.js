import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getTheme, COLORS } from '../utils/theme';
import secureStorage from '../utils/secureStorage';

const THEME_STORAGE_KEY = 'casetrack_theme_mode';

export const ThemeContext = createContext({
  theme: getTheme(true),
  colors: COLORS.dark,
  isDark: true,
  themeMode: 'system',
  setThemeMode: async () => {},
  toggleTheme: () => {},
  cycleThemeMode: () => {},
  loadingTheme: true,
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeMode, setThemeModeState] = useState('system'); // 'system' | 'dark' | 'light'
  const [loadingTheme, setLoadingTheme] = useState(true);

  // Carrega a preferência persistida na inicialização
  useEffect(() => {
    let isMounted = true;
    const loadStoredTheme = async () => {
      try {
        const storedMode = await secureStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && storedMode && ['system', 'dark', 'light'].includes(storedMode)) {
          setThemeModeState(storedMode);
        }
      } catch (err) {
        console.warn('[ThemeContext] Falha ao recuperar tema salvo:', err);
      } finally {
        if (isMounted) setLoadingTheme(false);
      }
    };
    loadStoredTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determina se o tema ativo em tela é escuro
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    // Modo sistema: default para dark caso o sistema não forneça info
    return systemColorScheme === 'dark' || !systemColorScheme;
  }, [themeMode, systemColorScheme]);

  // Objeto completo com tokens e utilitários
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  // Função para salvar nova preferência
  const setThemeMode = useCallback(async (newMode) => {
    if (!['system', 'dark', 'light'].includes(newMode)) return;
    setThemeModeState(newMode);
    try {
      await secureStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('[ThemeContext] Falha ao persistir tema selecionado:', err);
    }
  }, []);

  // Alternador rápido (dark <-> light)
  const toggleTheme = useCallback(() => {
    const nextMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  // Ciclo sequencial entre os 3 modos: system -> light -> dark -> system
  const cycleThemeMode = useCallback(() => {
    const cycleMap = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    const nextMode = cycleMap[themeMode] || 'system';
    setThemeMode(nextMode);
    return nextMode;
  }, [themeMode, setThemeMode]);

  const value = useMemo(
    () => ({
      theme,
      colors: theme.colors,
      spacing: theme.spacing,
      radius: theme.radius,
      typography: theme.typography,
      isDark,
      themeMode,
      setThemeMode,
      toggleTheme,
      cycleThemeMode,
      loadingTheme,
    }),
    [theme, isDark, themeMode, setThemeMode, toggleTheme, cycleThemeMode, loadingTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
}

export default ThemeContext;
