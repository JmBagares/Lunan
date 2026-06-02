import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { lightColors, darkColors } from './theme';

const PREF_KEY = 'lunan.theme.pref'; // 'system' | 'light' | 'dark'

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPref] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setPref(v);
    });
  }, []);

  const setMode = (mode) => {
    setPref(mode);
    AsyncStorage.setItem(PREF_KEY, mode);
  };

  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const colors = dark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ colors, dark, pref, setMode }),
    [colors, dark, pref]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
