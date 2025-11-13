import { useContext } from 'react'
import { ThemeContext } from '@/contexts/ThemeContextDefinition'

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}
