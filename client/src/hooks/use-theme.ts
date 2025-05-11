import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  // Initialize with the stored preference, or system preference, or light as fallback
  const [theme, setTheme] = useState<Theme>(() => {
    // Check local storage
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to light
    return 'light';
  });

  useEffect(() => {
    // Update class on document element
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Save preference to local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme };
}
