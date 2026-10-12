import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'makhzan.theme';
const ThemeContext = createContext(null);

function readInitialTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch {
        // Storage can be unavailable (private mode); fall back to system preference.
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(readInitialTheme);

    useEffect(() => {
        const root = document.documentElement;

        root.classList.add('mk-theming');
        root.classList.toggle('dark', theme === 'dark');

        const timer = setTimeout(() => root.classList.remove('mk-theming'), 350);

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Non-critical.
        }

        return () => clearTimeout(timer);
    }, [theme]);

    const toggleTheme = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), []);

    const value = useMemo(() => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }), [theme, toggleTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }

    return context;
}
