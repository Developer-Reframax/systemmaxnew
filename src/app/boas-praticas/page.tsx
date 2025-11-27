'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import {
  Lightbulb,
  Plus,
  TrendingUp,
  FolderOpen,
  Target,
  Columns,
  Tag,
  Users,
  Vote
} from 'lucide-react'

export default function BoasPraticasPage() {
  const router = useRouter()
  useAuth()
  const [stats, setStats] = useState({ total: 0, emAnalise: 0, invalEliminada: 0 })

  useEffect(() => {
    const loadStats = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      try {
        const res = await fetch('/api/boas-praticas/stats', {
          headers: { Authorization: `Bearer ${token}` }
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

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Boas Práticas - Lab Idéias</h1>
            <p className="text-gray-600">Gestao de idéias e boas praticas da organizacao</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/boas-praticas')}
              className='bg-green-600 hover:bg-green-700'
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova idéia
            </Button>
            <Button
              onClick={() => router.push('/boas-praticas/novo')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Boa Prática
            </Button>
          </div>
        </div>

        {/* Indicadores simples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total de Boas Práticas</CardTitle>
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
              <p className="text-xs text-gray-500">Status diferente de Concluído</p>
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
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/lista')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listar Boas Práticas</CardTitle>
              <Lightbulb className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Visao geral</div>
              <p className="text-xs text-muted-foreground">
                Lista global de boas práticas
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/minhas')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minhas Boas Praticas</CardTitle>
              <Lightbulb className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Meus cadastros</div>
              <p className="text-xs text-muted-foreground">
                Práticas cadastradas por voce
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/responsaveis-contratos')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responsaveis por Contrato</CardTitle>
              <Lightbulb className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Configurar</div>
              <p className="text-xs text-muted-foreground">
                Defina responsaveis SESMT e Gestor por contrato
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/comites')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comites</CardTitle>
              <Users className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Locais e corporativos</div>
              <p className="text-xs text-muted-foreground">
                Cadastre e gerencie comites por contrato ou corporativos
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/itens-avaliacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens de Avaliacao</CardTitle>
              <Lightbulb className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Perguntas</div>
              <p className="text-xs text-muted-foreground">
                Cadastre itens para futuros questionarios
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/avaliacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliar Boas Praticas</CardTitle>
              <Lightbulb className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Fila SESMT</div>
              <p className="text-xs text-muted-foreground">
                Avaliacoes pendentes para seu contrato
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/validacao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validacao</CardTitle>
              <Lightbulb className="h-4 w-4 text-indigo-700" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Validar</div>
              <p className="text-xs text-muted-foreground">
                Validar boas praticas apos avaliacao da gestao
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/book')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Book</CardTitle>
              <Lightbulb className="h-4 w-4 text-cyan-700" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Explorar</div>
              <p className="text-xs text-muted-foreground">
                Visualizar boas praticas validadas estilo blog
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/avaliacao-gestao')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliar Boas Praticas (Gestao)</CardTitle>
              <Lightbulb className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Fila Gestao</div>
              <p className="text-xs text-muted-foreground">
                Avaliacoes pendentes para gestores
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/votacao-trimestral')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Votacao Trimestral</CardTitle>
              <Vote className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Votar</div>
              <p className="text-xs text-muted-foreground">
                Vote nas boas praticas do seu contrato
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/votacao-anual')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Votacao Anual</CardTitle>
              <Vote className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Votar</div>
              <p className="text-xs text-muted-foreground">
                Vote nas boas praticas em nivel corporativo
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/categorias')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias</CardTitle>
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">
                Categorias de boas praticas
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/elimina-desperdicio')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eliminacao de Desperdicio</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">
                Opcoes de eliminacao de desperdicio
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/pilares')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pilares</CardTitle>
              <Columns className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">
                Pilares de boas praticas
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/boas-praticas/tags-catalogo')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
              <Tag className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Gerenciar</div>
              <p className="text-xs text-muted-foreground">
                Tags do catalogo
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
