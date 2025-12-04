import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  colors: {
    background: string;
    backgroundLight: string;
    textPrimary: string;
    textSecondary: string;
    textLight: string;
    primary: string;
    primaryDark: string;
    secondary: string;
    cardBackground: string;
    border: string;
    shadow: string;
  };
}

const lightColors = {
  background: '#F5F9FC',
  backgroundLight: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  primary: '#2196F3',
  primaryDark: '#1976D2',
  secondary: '#4CAF50',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  shadow: '#000000',
};

const darkColors = {
  background: '#121212',
  backgroundLight: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textLight: '#808080',
  primary: '#64B5F6',
  primaryDark: '#2196F3',
  secondary: '#81C784',
  cardBackground: '#1E1E1E',
  border: '#333333',
  shadow: '#000000',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Carregar tema salvo
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        } else {
          // Usar tema do sistema se não houver preferência salva
          setTheme(systemTheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
        setTheme('light');
      }
    };
    loadTheme();
  }, [systemTheme]);

  const toggleTheme = async () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

