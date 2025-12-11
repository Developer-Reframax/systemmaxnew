import type { ReactNode } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { menuItems } from '@/config/menu'
import { requireUser } from '@/lib/auth-server'
import { getUserPermissions } from '@/lib/permissions-server'
import type { AuthUser } from '@/lib/auth'
import type { PermissionsResponse } from '@/lib/types/permissions'

function filterMenuByPermissions(user: AuthUser, permissions: PermissionsResponse | null) {
  return menuItems.filter((item) => {
    if (item.roles && !item.roles.includes(user.role)) {
      return false
    }

    if (item.moduleSlug) {
      const hasModule = permissions?.modulos.some((modulo) => modulo.slug === item.moduleSlug)
      if (!hasModule) return false
    }

    return true
  })
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  let permissions: PermissionsResponse | null = null

  try {
    permissions = await getUserPermissions(user)
  } catch (error) {
    console.error('Erro ao carregar permissoes para o menu (SSR):', error)
  }

  const allowedMenuItems = filterMenuByPermissions(user, permissions)

  return <MainLayout allowedMenuItems={allowedMenuItems}>{children}</MainLayout>
}
