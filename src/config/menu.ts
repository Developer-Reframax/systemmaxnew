export type MenuIcon =
  | 'home'
  | 'users'
  | 'settings'
  | 'activity'
  | 'alertTriangle'
  | 'barChart'
  | 'book'
  | 'brain'
  | 'building'
  | 'clipboardCheck'
  | 'clipboardList'
  | 'layoutPanel'
  | 'layers'
  | 'lightbulb'
  | 'mail'
  | 'package'
  | 'shield'
  | 'userCheck'
  | 'userPlus'
  | 'messageSquare'
  | 'heart'


export type MenuItem = {
  name: string
  href: string
  icon: MenuIcon
  roles?: string[]
  moduleSlug?: string
}

export const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Usuarios', href: '/users', icon: 'users', roles: ['Admin', 'Editor'], moduleSlug: 'usuario' },
  { name: 'Contratos', href: '/contracts', icon: 'building', roles: ['Admin', 'Editor'], moduleSlug: 'contratos' },
  { name: 'Modulos', href: '/modules', icon: 'layers', roles: ['Admin'] },
  { name: 'Letras', href: '/letters', icon: 'mail', roles: ['Admin', 'Editor'], moduleSlug: 'letras' },
  { name: 'Equipes', href: '/teams', icon: 'userCheck', roles: ['Admin', 'Editor'], moduleSlug: 'equipes' },
  { name: 'Almoxarifado', href: '/almoxarifado', icon: 'package', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'almoxarifado' },
  { name: 'Inspecoes e Checks', href: '/inspecoes', icon: 'clipboardList', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'inspecoes_checks' },
  { name: 'Boas Praticas / Lab Ideias', href: '/boas-praticas', icon: 'lightbulb', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'boas_praticas' },
  { name: 'Apadrinhamento', href: '/apadrinhamento', icon: 'userPlus', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'apadrinhamento' },
  { name: 'Interacoes', href: '/interacoes', icon: 'messageSquare', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'interacoes' },
  { name: "3 P's", href: '/3ps', icon: 'clipboardCheck', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: '3p' },
  { name: 'Relatos/Desvios', href: '/desvios', icon: 'alertTriangle', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'relatos_desvios' },
  { name: 'Gestao de emociograma', href: '/emociograma', icon: 'heart', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'emociograma' },
  { name: 'Prontidao Cognitiva', href: '/prontidao', icon: 'brain', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'teste_prontidao' },
  { name: 'OAC', href: '/oac', icon: 'clipboardCheck', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'oac' },
  { name: 'Parametrizacao de Seguranca', href: '/security-params', icon: 'shield', roles: ['Admin', 'Editor'], moduleSlug: 'parametrizacao_seguranca' },
  { name: 'Sessoes', href: '/sessions', icon: 'activity', roles: ['Admin'], moduleSlug: 'monitoramento_seguranca' },
  { name: 'Documentacao', href: '/documentation', icon: 'book', roles: ['Admin', 'Editor', 'Viewer'], moduleSlug: 'documentacao' },
  { name: 'Configuracoes', href: '/settings', icon: 'settings', roles: ['Admin'], moduleSlug: 'documentacao' }
]
