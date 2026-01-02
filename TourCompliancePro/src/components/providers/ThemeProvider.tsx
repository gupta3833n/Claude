import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig, ColorShades } from '@/types';

// Default theme colors (MakeMyTrip + Banking inspired)
const defaultColors = {
  primary: {
    50: '240 249 255',
    100: '224 242 254',
    200: '186 230 253',
    300: '125 211 252',
    400: '56 189 248',
    500: '22 72 128',
    600: '18 60 107',
    700: '14 48 85',
    800: '10 36 64',
    900: '6 24 42'
  },
  accent: {
    50: '254 242 242',
    100: '254 226 226',
    200: '254 202 202',
    300: '252 165 165',
    400: '248 113 113',
    500: '235 34 38',
    600: '220 38 38',
    700: '185 28 28',
    800: '153 27 27',
    900: '127 29 29'
  },
  success: {
    50: '236 253 245',
    100: '209 250 229',
    200: '167 243 208',
    300: '110 231 183',
    400: '52 211 153',
    500: '16 185 129',
    600: '5 150 105',
    700: '4 120 87',
    800: '6 95 70',
    900: '6 78 59'
  },
  warning: {
    50: '255 251 235',
    100: '254 243 199',
    200: '253 230 138',
    300: '252 211 77',
    400: '251 191 36',
    500: '245 158 11',
    600: '217 119 6',
    700: '180 83 9',
    800: '146 64 14',
    900: '120 53 15'
  },
  danger: {
    50: '254 242 242',
    100: '254 226 226',
    200: '254 202 202',
    300: '252 165 165',
    400: '248 113 113',
    500: '239 68 68',
    600: '220 38 38',
    700: '185 28 28',
    800: '153 27 27',
    900: '127 29 29'
  }
};

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
  colors: typeof defaultColors;
  setColors: (colors: Partial<typeof defaultColors>) => void;
  resetColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [colors, setColorsState] = useState(() => {
    const saved = localStorage.getItem('theme-colors');
    if (saved) {
      try {
        return { ...defaultColors, ...JSON.parse(saved) };
      } catch {
        return defaultColors;
      }
    }
    return defaultColors;
  });

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-dark', String(isDark));
  }, [isDark]);

  // Apply custom colors
  useEffect(() => {
    const root = document.documentElement;

    // Set CSS variables for each color
    Object.entries(colors).forEach(([colorName, shades]) => {
      Object.entries(shades as ColorShades).forEach(([shade, value]) => {
        root.style.setProperty(`--color-${colorName}-${shade}`, value);
      });
    });

    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, [colors]);

  const toggleDark = () => setIsDark(prev => !prev);

  const setColors = (newColors: Partial<typeof defaultColors>) => {
    setColorsState(prev => ({ ...prev, ...newColors }));
  };

  const resetColors = () => {
    setColorsState(defaultColors);
    localStorage.removeItem('theme-colors');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, colors, setColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
