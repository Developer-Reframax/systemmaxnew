'use client'

import { createContext } from 'react'
import type { ThemeContextType } from '@/lib/types/theme'

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)