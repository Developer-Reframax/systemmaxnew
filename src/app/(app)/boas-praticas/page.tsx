'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/contexts/PermissionsContext'
import {
  Lightbulb,
  Plus,
  TrendingUp,
  FolderOpen,
  Target,
  Columns,
  Tag,
  Users,
  Vote,
  BarChart3
} from 'lucide-react'

export default function BoasPraticasPage() {
  const router = useRouter()
  const BOAS_IDEIAS_FORM_URL =
    'https://forms.office.com/Pages/ResponsePage.aspx?id=p2DZs4_mEEanKQQUrL5_SC1Khj_bYuNGgRfwieHhNtVUOFdYSEtESDEzSFVHSFRETFEzT0JWVzFJTi4u'
  useAuth()
  const { permissions, loading: permissionsLoading } = usePermissions()
  const BOASPRATICAS_CADASTRO_SLUG = 'boaspraticas-cadastro'
  const BOASPRATICAS_GESTAO_GERAL_SLUG = 'boaspraticas-gestao-geral'
  const BOASPRATICAS_GESTAO_LOCAL_SLUG = 'boaspraticas-gestao-local'

  const hasPermissionSlug = (slug: string) =>
    !!permissions?.modulos.some((modulo) =>
      modulo.funcionalidades.some((funcionalidade) => funcionalidade.slug === slug)
    )

  const canCreateBoaPratica = !permissionsLoading && hasPermissionSlug(BOASPRATICAS_CADASTRO_SLUG)
  const canSeeGestaoGeralCards = !permissionsLoading && hasPermissionSlug(BOASPRATICAS_GESTAO_GERAL_SLUG)
  const canSeeVisaoGeral = !permissionsLoading && hasPermissionSlug(BOASPRATICAS_GESTAO_LOCAL_SLUG)

  const [stats, setStats] = useState({ total: 0, emAnalise: 0, invalEliminada: 0 })
  const [isResponsavelSesmt, setIsResponsavelSesmt] = useState(false)
  const [isResponsavelGestor, setIsResponsavelGestor] = useState(false)
  const [isMembroComiteLocal, setIsMembroComiteLocal] = useState(false)
  const [isMembroComiteCorporativo, setIsMembroComiteCorporativo] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/boas-praticas/stats', {
          method: 'GET'
        })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (json?.data) setStats(json.data)
      } catch {
        // silencioso
      }
    }
    loadStats()
  }, [])

  useEffect(() => {
    const loadResponsavelSesmt = async () => {
      try {
        const res = await fetch('/api/boas-praticas/responsaveis-contratos/me', {
          method: 'GET'
        })
        if (!res.ok) {
          setIsResponsavelSesmt(false)
          return
        }
        const json = await res.json()
        setIsResponsavelSesmt(!!json?.isResponsavelSesmt)
        setIsResponsavelGestor(!!json?.isResponsavelGestor)
        setIsMembroComiteLocal(!!json?.isMembroComiteLocal)
        setIsMembroComiteCorporativo(!!json?.isMembroComiteCorporativo)
      } catch {
        setIsResponsavelSesmt(false)
        setIsResponsavelGestor(false)
        setIsMembroComiteLocal(false)
        setIsMembroComiteCorporativo(false)
      }
    }

    loadResponsavelSesmt()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 sm:max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900">Boas Praticas - Boas Idéias</h1>
          <p className="text-gray-600">Gestao de ideias e boas praticas da organizacao</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => window.open(BOAS_IDEIAS_FORM_URL, '_blank', 'noopener,noreferrer')}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova ideia
          </Button>
          {canCreateBoaPratica && (
            <Button
              onClick={() => router.push('/boas-praticas/novo')}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Boa Pratica
            </Button>
          )}
        </div>
      </div>

      {/* Indicadores simples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Total de Boas Praticas</CardTitle>
            <Lightbulb className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Contagem real do contrato</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Em Analise</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{stats.emAnalise}</p>
            <p className="text-xs text-gray-500">Status diferente de Concluido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Invalida / Eliminada</CardTitle>
            <Lightbulb className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{stats.invalEliminada}</p>
            <p className="text-xs text-gray-500">Status contendo invalida/eliminada</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuracoes e Catalogos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {canSeeVisaoGeral && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/lista')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listar Boas Praticas</CardTitle>
              <Lightbulb className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Visao geral</div>
              <p className="text-xs text-muted-foreground">Lista global de boas praticas</p>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/minhas')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minhas Boas Praticas</CardTitle>
            <Lightbulb className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Meus cadastros</div>
            <p className="text-xs text-muted-foreground">Praticas cadastradas por voce</p>
          </CardContent>
        </Card>

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/relatorios')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relatorios Graficos</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Analisar dados</div>
              <p className="text-xs text-muted-foreground">Indicadores, graficos e tabela consolidada de boas praticas</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/responsaveis-contratos')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responsaveis por Contrato</CardTitle>
              <Lightbulb className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Configurar</div>
              <p className="text-xs text-muted-foreground">Defina responsaveis SESMT e Gestor por contrato</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/comites')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comites</CardTitle>
              <Users className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Locais e corporativos</div>
              <p className="text-xs text-muted-foreground">Cadastre e gerencie comites por contrato ou corporativos</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/itens-avaliacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens de Avaliacao</CardTitle>
              <Lightbulb className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Perguntas</div>
              <p className="text-xs text-muted-foreground">Cadastre itens para futuros questionarios</p>
            </CardContent>
          </Card>
        )}

        {isResponsavelSesmt && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/avaliacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliar Boas Praticas</CardTitle>
              <Lightbulb className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Fila SESMT</div>
              <p className="text-xs text-muted-foreground">Avaliacoes pendentes para seu contrato</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/validacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validacao</CardTitle>
              <Lightbulb className="h-4 w-4 text-indigo-700" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Validar</div>
              <p className="text-xs text-muted-foreground">Validar boas praticas apos avaliacao da gestao</p>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/book')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Book</CardTitle>
            <Lightbulb className="h-4 w-4 text-cyan-700" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Explorar</div>
            <p className="text-xs text-muted-foreground">Visualizar boas praticas validadas estilo blog</p>
          </CardContent>
        </Card>

        {isResponsavelGestor && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/avaliacao-gestao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliar Boas Praticas (Gestao)</CardTitle>
              <Lightbulb className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Fila Gestao</div>
              <p className="text-xs text-muted-foreground">Avaliacoes pendentes para gestores</p>
            </CardContent>
          </Card>
        )}

        {isMembroComiteLocal && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/votacao-trimestral')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Votacao Trimestral</CardTitle>
              <Vote className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Votar</div>
              <p className="text-xs text-muted-foreground">Vote nas boas praticas do seu contrato</p>
            </CardContent>
          </Card>
        )}

        {isMembroComiteCorporativo && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/votacao-anual')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Votacao Anual</CardTitle>
              <Vote className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Votar</div>
              <p className="text-xs text-muted-foreground">Vote nas boas praticas em nivel corporativo</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/categorias')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias</CardTitle>
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">Categorias de boas praticas</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/elimina-desperdicio')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eliminacao de Desperdicio</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">Opcoes de eliminacao de desperdicio</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/pilares')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pilares</CardTitle>
              <Columns className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">Pilares de boas praticas</p>
            </CardContent>
          </Card>
        )}

        {canSeeGestaoGeralCards && (
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/tags-catalogo')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
              <Tag className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">Tags do catalogo</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
