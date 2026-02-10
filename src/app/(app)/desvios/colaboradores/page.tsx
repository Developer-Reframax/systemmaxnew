'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Download, Filter, ArrowUpDown, Users, CheckCircle, XCircle } from 'lucide-react'
import * as ExcelJS from 'exceljs'
import { toast } from 'sonner'

type ColaboradorRegistro = {
  matricula: number
  nome: string
  funcao?: string | null
  equipe_id?: string | null
  equipe?: string | null
  total_desvios: number
  registrou: boolean
}

type Team = {
  id: string
  equipe?: string | null
}

type SortKey = 'nome' | 'matricula' | 'equipe' | 'total_desvios' | 'registrou'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

export default function DesviosColaboradores() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [equipeId, setEquipeId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ColaboradorRegistro[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('nome')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, idx) => current - 2 + idx)
  }, [])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams', { method: 'GET' })
      if (!response.ok) {
        throw new Error('Erro ao carregar equipes')
      }
      const data = await response.json()
      setTeams(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
      toast.error('Erro ao carregar equipes')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString()
      })
      if (equipeId) params.set('equipe_id', equipeId)

      const response = await fetch(`/api/desvios/colaboradores?${params}`, { method: 'GET' })
      if (!response.ok) {
        throw new Error('Erro ao carregar dados')
      }
      const data = await response.json()
      if (data.success) {
        setRows(data.data || [])
      } else {
        toast.error(data.message || 'Erro ao carregar dados')
      }
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error)
      toast.error('Erro ao carregar colaboradores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadTeams()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, month, year, equipeId])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const sortedRows = useMemo(() => {
    const data = [...rows]
    data.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'matricula':
          return direction * (a.matricula - b.matricula)
        case 'total_desvios':
          return direction * (a.total_desvios - b.total_desvios)
        case 'registrou':
          return direction * (Number(a.registrou) - Number(b.registrou))
        case 'equipe':
          return direction * (a.equipe || '').localeCompare(b.equipe || '', 'pt-BR')
        case 'nome':
        default:
          return direction * a.nome.localeCompare(b.nome, 'pt-BR')
      }
    })
    return data
  }, [rows, sortKey, sortDir])

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Colaboradores')

      worksheet.columns = [
        { header: 'Matricula', key: 'matricula', width: 12 },
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'Funcao', key: 'funcao', width: 22 },
        { header: 'Equipe', key: 'equipe', width: 20 },
        { header: 'Registros', key: 'total_desvios', width: 12 },
        { header: 'Registrou?', key: 'registrou', width: 12 }
      ]

      sortedRows.forEach((row) => {
        worksheet.addRow({
          matricula: row.matricula,
          nome: row.nome,
          funcao: row.funcao || '-',
          equipe: row.equipe || '-',
          total_desvios: row.total_desvios,
          registrou: row.registrou ? 'Sim' : 'Nao'
        })
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `desvios-colaboradores-${year}-${String(month).padStart(2, '0')}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error)
      toast.error('Erro ao exportar para Excel')
    }
  }

  const totalComDesvio = rows.filter((item) => item.total_desvios > 0).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Registro de desvios por colaborador</h1>
        <p className="text-gray-600 mt-2">
          Visao por contrato com filtros de mes, ano e equipe
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {MONTHS.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.equipe || '-'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          {rows.length} colaboradores • {totalComDesvio} com registros
        </div>
        <button
          onClick={exportToExcel}
          disabled={sortedRows.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Exportar Excel ({sortedRows.length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando colaboradores...</p>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum colaborador encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('matricula')}
                      className="inline-flex items-center gap-1"
                    >
                      Matricula
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('nome')}
                      className="inline-flex items-center gap-1"
                    >
                      Nome
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funcao
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('equipe')}
                      className="inline-flex items-center gap-1"
                    >
                      Equipe
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('total_desvios')}
                      className="inline-flex items-center gap-1"
                    >
                      Registros
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('registrou')}
                      className="inline-flex items-center gap-1"
                    >
                      Registrou?
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRows.map((row) => (
                  <tr key={row.matricula} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.matricula}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.funcao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {row.equipe || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.total_desvios}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {row.registrou ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <XCircle className="h-4 w-4" />
                          Nao
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
