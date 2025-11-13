import type { Theme } from '@/lib/types/theme'

// Função para alternar entre temas
export function toggleTheme(currentTheme: Theme): Theme {
  return currentTheme === 'light' ? 'dark' : 'light'
}

// Função para aplicar tema ao documento
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// Função para salvar tema no localStorage
export function saveThemeToStorage(theme: Theme): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme)
  }
}

// Função para carregar tema do localStorage
export function loadThemeFromStorage(): Theme {
  if (typeof window === 'undefined') {
    return 'light' // tema padrão para SSR
  }
  
  const savedTheme = localStorage.getItem('theme') as Theme | null
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    return savedTheme
  }
  return 'light' // tema padrão
}
