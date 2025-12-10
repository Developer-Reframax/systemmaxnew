import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'sonner'
import SessionTracker from '@/components/SessionTracker'
import { PermissionsProvider } from '@/contexts/PermissionsContext'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Gestão de Segurança do Trabalho",
  description: "Sistema completo para gestão de segurança do trabalho",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <PermissionsProvider>
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
