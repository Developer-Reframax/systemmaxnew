// src/app/(app)/layout.tsx
import MainLayout from '@/components/Layout/MainLayout'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // aqui você NÃO precisa repetir AuthProvider/PermissionsProvider,
  // porque o RootLayout já está fazendo isso para tudo
  return <MainLayout>{children}</MainLayout>
}
