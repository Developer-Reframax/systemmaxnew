'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import * as ExcelJS from 'exceljs'

interface Colaborador3P {
  matricula: number
  nome: string
  funcao: string | null
  equipe: string | null
  letra: string | null
  dataRealizacao3p: string | null
  createdCount: number
  participatedCount: number
  totalCount: number
  fez3p: boolean
}

interface ExportRow3PColaborador {
  registro_id: number
  data_hora_registro: string | null
  area_id: number | null
  area: string | null
  contrato: string | null
  atividade: string | null
  tipo_3p: string | null
  paralisacao_realizada: boolean | null
  riscos_avaliados: boolean | null
  ambiente_avaliado: boolean | null
  passo_descrito: boolean | null
  hipoteses_levantadas: boolean | null
  atividade_segura: boolean | null
  tipo_vinculo: string
  matricula_colaborador: number | null
  nome_colaborador: string | null
  funcao_colaborador: string | null
  equipe_colaborador: string | null
  letra_colaborador: string | null
  matricula_criador: number | null
  nome_criador: string | null
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
      const response = await fetch('/api/3ps/colaboradores/export', { method: 'GET' })
      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Erro ao carregar dados para exportacao')
        return
      }

      const registros: ExportRow3PColaborador[] = data.data || []
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Registros 3P')

      const formatDate = (value?: string | null) => {
        if (!value) return '-'
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) return '-'
        return parsed.toLocaleDateString('pt-BR')
      }

      const formatTime = (value?: string | null) => {
        if (!value) return '-'
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) return '-'
        return parsed.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }

      const formatBoolean = (value: boolean | null) => {
        if (value === null) return '-'
        return value ? 'Sim' : 'Nao'
      }

      worksheet.columns = [
        { header: 'Registro ID', key: 'registro_id', width: 12 },
        { header: 'Data do registro', key: 'data_registro', width: 16 },
        { header: 'Hora do registro', key: 'hora_registro', width: 14 },
        { header: 'Tipo vinculo', key: 'tipo_vinculo', width: 16 },
        { header: 'Matricula colaborador', key: 'matricula_colaborador', width: 18 },
        { header: 'Nome colaborador', key: 'nome_colaborador', width: 28 },
        { header: 'Funcao colaborador', key: 'funcao_colaborador', width: 22 },
        { header: 'Equipe colaborador', key: 'equipe_colaborador', width: 22 },
        { header: 'Letra colaborador', key: 'letra_colaborador', width: 16 },
        { header: 'Matricula criador', key: 'matricula_criador', width: 16 },
        { header: 'Nome criador', key: 'nome_criador', width: 28 },
        { header: 'Area ID', key: 'area_id', width: 10 },
        { header: 'Area', key: 'area', width: 24 },
        { header: 'Contrato', key: 'contrato', width: 18 },
        { header: 'Atividade', key: 'atividade', width: 50 },
        { header: 'Tipo 3P', key: 'tipo_3p', width: 16 },
        { header: 'Paralisacao realizada', key: 'paralisacao_realizada', width: 20 },
        { header: 'Riscos avaliados', key: 'riscos_avaliados', width: 18 },
        { header: 'Ambiente avaliado', key: 'ambiente_avaliado', width: 18 },
        { header: 'Passo descrito', key: 'passo_descrito', width: 18 },
        { header: 'Hipoteses levantadas', key: 'hipoteses_levantadas', width: 22 },
        { header: 'Atividade segura', key: 'atividade_segura', width: 18 }
      ]

      registros.forEach((registro) => {
        worksheet.addRow({
          registro_id: registro.registro_id,
          data_registro: formatDate(registro.data_hora_registro),
          hora_registro: formatTime(registro.data_hora_registro),
          tipo_vinculo: registro.tipo_vinculo,
          matricula_colaborador: registro.matricula_colaborador ?? '-',
          nome_colaborador: registro.nome_colaborador || '-',
          funcao_colaborador: registro.funcao_colaborador || '-',
          equipe_colaborador: registro.equipe_colaborador || '-',
          letra_colaborador: registro.letra_colaborador || '-',
          matricula_criador: registro.matricula_criador ?? '-',
          nome_criador: registro.nome_criador || '-',
          area_id: registro.area_id ?? '-',
          area: registro.area || '-',
          contrato: registro.contrato || '-',
          atividade: registro.atividade || '-',
          tipo_3p: registro.tipo_3p || '-',
          paralisacao_realizada: formatBoolean(registro.paralisacao_realizada),
          riscos_avaliados: formatBoolean(registro.riscos_avaliados),
          ambiente_avaliado: formatBoolean(registro.ambiente_avaliado),
          passo_descrito: formatBoolean(registro.passo_descrito),
          hipoteses_levantadas: formatBoolean(registro.hipoteses_levantadas),
          atividade_segura: formatBoolean(registro.atividade_segura)
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

  const exportTableToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Colaboradores 3P')

      worksheet.columns = [
        { header: 'Matricula', key: 'matricula', width: 14 },
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'Funcao', key: 'funcao', width: 24 },
        { header: 'Equipe', key: 'equipe', width: 24 },
        { header: 'Letra', key: 'letra', width: 14 },
        { header: 'Data realizacao 3P', key: 'dataRealizacao3p', width: 20 },
        { header: 'Fez 3P', key: 'fez3p', width: 12 },
        { header: 'Criados', key: 'createdCount', width: 12 },
        { header: 'Participacoes', key: 'participatedCount', width: 16 },
        { header: 'Total', key: 'totalCount', width: 12 }
      ]

      colaboradores.forEach((colaborador) => {
        worksheet.addRow({
          matricula: colaborador.matricula,
          nome: colaborador.nome,
          funcao: colaborador.funcao || '-',
          equipe: colaborador.equipe || '-',
          letra: colaborador.letra || '-',
          dataRealizacao3p: colaborador.dataRealizacao3p || '-',
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
      const fileName = `colaboradores_3ps_tabela_${timestamp}.xlsx`
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success(`Arquivo ${fileName} exportado com sucesso!`)
    } catch (error) {
      console.error('Erro ao exportar tabela para Excel:', error)
      toast.error('Erro ao exportar tabela para Excel')
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={exportTableToExcel}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel da tabela
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
        </div>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Data realizacao 3P</th>
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
                    <td className="px-4 py-3 text-gray-700">{colaborador.dataRealizacao3p || '-'}</td>
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
