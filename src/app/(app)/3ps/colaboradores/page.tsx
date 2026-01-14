'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet, Users } from 'lucide-react'
import { toast } from 'sonner'
import * as ExcelJS from 'exceljs'

interface Colaborador3P {
  matricula: number
  nome: string
  funcao: string | null
  equipe: string | null
  letra: string | null
  createdCount: number
  participatedCount: number
  totalCount: number
  fez3p: boolean
}

export default function Colaboradores3P() {
  const [colaboradores, setColaboradores] = useState<Colaborador3P[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadColaboradores = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/3ps/colaboradores', { method: 'GET' })
        const data = await response.json()

        if (response.ok && data.success) {
          setColaboradores(data.data || [])
        } else {
          toast.error(data.error || 'Erro ao carregar colaboradores')
        }
      } catch (error) {
        console.error('Erro ao carregar colaboradores 3P:', error)
        toast.error('Erro ao carregar colaboradores')
      } finally {
        setLoading(false)
      }
    }

    loadColaboradores()
  }, [])

  const totalCom3p = useMemo(() => colaboradores.filter((c) => c.fez3p).length, [colaboradores])

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Colaboradores 3P')

      worksheet.columns = [
        { header: 'Matricula', key: 'matricula', width: 12 },
        { header: 'Nome', key: 'nome', width: 28 },
        { header: 'Funcao', key: 'funcao', width: 20 },
        { header: 'Equipe', key: 'equipe', width: 18 },
        { header: 'Letra', key: 'letra', width: 10 },
        { header: 'Fez 3P', key: 'fez3p', width: 10 },
        { header: 'Criados', key: 'createdCount', width: 10 },
        { header: 'Participacoes', key: 'participatedCount', width: 15 },
        { header: 'Total', key: 'totalCount', width: 10 }
      ]

      colaboradores.forEach((colaborador) => {
        worksheet.addRow({
          matricula: colaborador.matricula,
          nome: colaborador.nome,
          funcao: colaborador.funcao || '-',
          equipe: colaborador.equipe || '-',
          letra: colaborador.letra || '-',
          fez3p: colaborador.fez3p ? 'Sim' : 'Nao',
          createdCount: colaborador.createdCount,
          participatedCount: colaborador.participatedCount,
          totalCount: colaborador.totalCount
        })
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const fileName = `colaboradores_3ps_${timestamp}.xlsx`
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success(`Arquivo ${fileName} exportado com sucesso!`)
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error)
      toast.error('Erro ao exportar dados para Excel')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/3ps"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Colaboradores - 3P</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {totalCom3p} de {colaboradores.length} colaboradores possuem participa&#231;&#227;o em 3P
          </p>
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Excel
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Carregando colaboradores...</div>
        ) : colaboradores.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Matricula</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Funcao</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Equipe</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Letra</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Fez 3P</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Criados</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Participacoes</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colaboradores.map((colaborador) => (
                  <tr key={colaborador.matricula} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{colaborador.matricula}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{colaborador.nome}</td>
                    <td className="px-4 py-3 text-gray-700">{colaborador.funcao || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{colaborador.equipe || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{colaborador.letra || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          colaborador.fez3p
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {colaborador.fez3p ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{colaborador.createdCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{colaborador.participatedCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{colaborador.totalCount}</td>
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
