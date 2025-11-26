'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface PraticaValidacao {
  id: string
  titulo: string
  status: string
  contrato?: string | null
  created_at?: string
}

export default function ValidacaoBoasPraticasPage() {
  useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PraticaValidacao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) { setLoading(false); return }
      try {
        const res = await fetch('/api/boas-praticas/validacao', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setItems(json.data || [])
      } catch {
        toast.error('Erro ao carregar fila de validacao')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Validacao de Boas Praticas</h1>
            <p className="text-gray-600">Praticas aguardando validacao final</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            Voltar ao modulo
          </Button>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Fila de validacao</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-600">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow border border-blue-100">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{item.titulo}</span>
                        <span className="text-sm text-gray-700">
                          Contrato:{' '}
                          <span className="font-medium text-blue-700">{item.contrato || '-'}</span>
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          Criada em {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                          {item.status}
                        </Badge>
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          onClick={() => router.push(`/boas-praticas/validacao/${item.id}`)}
                        >
                          Realizar validacao
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && !loading && (
                  <div className="text-center text-gray-500 py-6">Nenhuma pratica para validar</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
