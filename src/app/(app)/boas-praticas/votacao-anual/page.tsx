'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, Vote } from 'lucide-react'

type Pratica = {
  id: string
  titulo: string
  contrato?: string | null
  status: string
  created_at?: string
}

export default function VotacaoAnualListaPage() {
  useAuth()
  const router = useRouter()
  const [praticas, setPraticas] = useState<Pratica[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/boas-praticas/votacao-anual', {
          method:'GET'
        })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setPraticas(json.data || [])
      } catch {
        toast.error('Erro ao carregar praticas para votacao')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Votacao Anual</h1>
            <p className="text-gray-600">Boas praticas aguardando votacao anual</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            Voltar ao modulo
          </Button>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Fila de votacao</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-600">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {praticas.map((p) => (
                  <Card key={p.id} className="hover:shadow-lg transition-shadow border border-blue-100">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{p.titulo}</span>
                        <span className="text-sm text-gray-700">
                          Contrato:{' '}
                          <span className="font-medium text-blue-700">{p.contrato || '-'}</span>
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          Criada em {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Aguardando votacao
                        </Badge>
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          onClick={() => router.push(`/boas-praticas/votacao-anual/${p.id}`)}
                        >
                          <Vote className="w-4 h-4 mr-2" />
                          Realizar votacao
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {praticas.length === 0 && !loading && (
                  <Card>
                    <CardContent className="py-10 text-center space-y-2">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                      <div className="font-semibold text-gray-800">Nenhuma votacao pendente</div>
                      <p className="text-sm text-gray-600">
                        Voce ja votou em todas as praticas disponiveis ou nao ha praticas aguardando votacao.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
