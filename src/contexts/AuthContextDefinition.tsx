'use client'

import { createContext } from 'react'
import type { AuthContextType } from '@/lib/types/auth'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)