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
  | 'bot'


export type MenuItem = {
  name: string
  href: string
  icon: MenuIcon
  roles?: string[]
  moduleSlug?: string
  functionalitySlug?: string
}

export const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Usuarios', href: '/users', icon: 'users', moduleSlug: 'usuario' },
  { name: 'Contratos', href: '/contracts', icon: 'building', roles: ['Admin'], moduleSlug: 'contratos' },
  { name: 'Modulos', href: '/modules', icon: 'layers', roles: ['Admin'] },
  { name: 'Letras', href: '/letters', icon: 'mail', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'letras', functionalitySlug: 'letras-gestao' },
  { name: 'Equipes', href: '/teams', icon: 'userCheck', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'equipes', functionalitySlug: 'equipes-gestao' },
  { name: 'Almoxarifado', href: '/almoxarifado', icon: 'package', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'almoxarifado' },
  { name: 'Inspecoes e Checks', href: '/inspecoes', icon: 'clipboardList', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'inspecoes_checks' },
  { name: 'Boas Praticas / Boas Idéias', href: '/boas-praticas', icon: 'lightbulb', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'boas_praticas' },
  { name: 'Apadrinhamento', href: '/apadrinhamento', icon: 'userPlus', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'apadrinhamento', functionalitySlug: 'apadrinhamento-acesso' },
  { name: "3 P's", href: '/3ps', icon: 'clipboardCheck', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: '3p', functionalitySlug: '3p-acesso' },
  { name: 'Relatos/Desvios', href: '/desvios', icon: 'alertTriangle', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'relatos_desvios' },
  { name: 'Gestao de emociograma', href: '/emociograma', icon: 'heart', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'emociograma' },
  { name: 'OAC', href: '/oac', icon: 'clipboardCheck', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'oac', functionalitySlug: 'oac-acesso' },
   { name: 'Agentes de IA', href: '/agentes', icon: 'bot', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'agentes', functionalitySlug: 'ia-interagir-agent' },
  { name: 'Parametrizacao de Seguranca', href: '/security-params', icon: 'shield', roles: ['Admin'] },
  { name: 'Sessoes', href: '/sessions', icon: 'activity', roles: ['Admin'], moduleSlug: 'monitoramento_seguranca' },
  { name: 'Documentacao', href: '/documentation', icon: 'book', roles: ['Admin', 'Editor', 'Usuario'], moduleSlug: 'documentacao' },
  { name: 'Configuracoes', href: '/settings', icon: 'settings', roles: ['Admin'] }
]
