'use client'

import React, { useState, useEffect } from 'react'
import type { Theme, ThemeContextType, ThemeProviderProps } from '@/lib/types/theme'
import { toggleTheme as toggleThemeUtil, applyThemeToDocument, saveThemeToStorage, loadThemeFromStorage } from '@/lib/theme-utils'
import { ThemeContext } from './ThemeContextDefinition'

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = loadThemeFromStorage()
    setThemeState(savedTheme)
  }, [])

  // Apply theme to document
  useEffect(() => {
    applyThemeToDocument(theme)
    saveThemeToStorage(theme)
  }, [theme])

  const toggleTheme = () => {
    setThemeState(prevTheme => toggleThemeUtil(prevTheme))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
