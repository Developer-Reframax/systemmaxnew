/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
// eslint-disable-next-line react-refresh/only-export-components
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'sonner'
import SessionTracker from '@/components/SessionTracker'
import { PermissionsProvider } from '@/contexts/PermissionsContext'
import { getCurrentUserOrNull } from '@/lib/auth-server'
import { getUserPermissions } from '@/lib/permissions-server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Gestão de SeguranÇõÇœa do Trabalho',
  description: 'Sistema completo para gestão de segurança do trabalho'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUserOrNull()
  let initialPermissions = null

  if (user) {
    try {
      initialPermissions = await getUserPermissions(user)
    } catch (error) {
      console.error('Erro ao carregar permissoes iniciais via SSR:', error)
    }
  }

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <AuthProvider initialUser={user}>
            <PermissionsProvider initialPermissions={initialPermissions}>
              <Suspense fallback={null}>
                <SessionTracker />
              </Suspense>
              {children}
            </PermissionsProvider>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
