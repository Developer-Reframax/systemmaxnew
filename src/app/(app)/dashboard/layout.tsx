import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Layout de guarda leve: apenas verifica se existe o cookie auth_token.
// Se o cookie não existir, redireciona para /login antes de renderizar a página.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const hasAuthCookie = Boolean((await cookies()).get('auth_token'))

  if (!hasAuthCookie) {
    redirect('/login')
  }

  return <>{children}</>
}

