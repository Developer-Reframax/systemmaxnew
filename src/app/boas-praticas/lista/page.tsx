'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Lightbulb, 
  Plus,
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  Filter,
  Users,
  LayoutDashboard
} from 'lucide-react'
import { toast } from 'sonner'

interface BoaPratica {
  id: string
  titulo: string
  status: string
  created_at?: string
  autor_nome?: string
  area_aplicada_nome?: string
  pilar_nome?: string
}

export default function ListaBoasPraticasPage() {
  const [items, setItems] = useState<BoaPratica[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  useAuth()

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) { setLoading(false); return }
      
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const res = await fetch(`/api/boas-praticas?${params.toString()}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
        if (!res.ok) { 
          toast.error('Erro ao carregar boas praticas')
          setLoading(false)
          return 
        }
        const json = await res.json()
        setItems(json.data || [])
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [search])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aprovada':
        return 'bg-green-100 text-green-800'
      case 'implementada':
        return 'bg-blue-100 text-blue-800'
      case 'em_analise':
      case 'pendente':
      case 'aguardando validacao':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejeitada':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aprovada':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'implementada':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'em_analise':
      case 'pendente':
      case 'aguardando validacao':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Lightbulb className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Boas Praticas</h1>
            <p className="text-gray-600">Lista completa de boas praticas com busca</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
              Voltar ao modulo
            </Button>
            <Button onClick={() => router.push('/boas-praticas/novo')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Boa Pratica
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Boas Praticas</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="Buscar por titulo ou descricao" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-64"
                />
                <Button variant="outline" onClick={() => setSearch('')}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <Card 
                    key={item.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/boas-praticas/${item.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(item.status)}
                            <h3 className="font-semibold text-gray-900">{item.titulo}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {item.area_aplicada_nome && (
                              <span className="flex items-center gap-1">
                                <Filter className="w-3 h-3" />
                                {item.area_aplicada_nome}
                              </span>
                            )}
                            {item.pilar_nome && (
                              <span>{item.pilar_nome}</span>
                            )}
                            {item.autor_nome && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {item.autor_nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status?.replace('_', ' ')}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/boas-praticas/${item.id}/visao-estrategica`)
                            }}
                          >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Visao estrategica
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && !loading && (
                  <div className="py-8 text-center text-gray-500">
                    Nenhuma boa pratica encontrada
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
