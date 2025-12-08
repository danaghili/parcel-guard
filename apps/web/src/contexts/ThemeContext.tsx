import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { settingsApi } from '@/lib/api'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_STORAGE_KEY = 'parcelguard-theme'

function applyTheme(theme: Theme): void {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load from localStorage immediately to prevent flash
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    return stored ?? 'system'
  })
  const [isLoading, setIsLoading] = useState(true)

  // Apply theme immediately on mount and when theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Load theme from API on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const settings = await settingsApi.get()
        if (settings.theme) {
          setThemeState(settings.theme)
          localStorage.setItem(THEME_STORAGE_KEY, settings.theme)
        }
      } catch (err) {
        // If API fails, keep using localStorage/default value
        console.error('Failed to load theme from API:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTheme()
  }, [])

  const setTheme = useCallback(async (newTheme: Theme) => {
    const previousTheme = theme

    // Optimistically update
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)

    try {
      await settingsApi.update({ theme: newTheme })
    } catch (err) {
      // Revert on error
      setThemeState(previousTheme)
      localStorage.setItem(THEME_STORAGE_KEY, previousTheme)
      throw err
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
