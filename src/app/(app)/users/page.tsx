'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Usuario } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Settings, Shield, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Contrato, UsuarioContrato, Funcionalidade, FuncionalidadeUsuario } from '@/lib/supabase'
import * as ExcelJS from 'exceljs'
import { useCanAccessFuncionalidade, useModuloComFuncionalidades } from '@/contexts/PermissionsContext'

interface UserFormData {
  nome: string
  email: string
  matricula: number
  senha?: string
  funcao: string
  contrato_raiz: string
  phone: string
  role: 'Admin' | 'Editor' | 'Usuario'
  status: 'ativo' | 'inativo'
  letra_id?: string
  equipe_id?: string
}

interface ContractOption {
  codigo: string
  nome: string
  status: string
}

interface LetterOption {
  id: string
  letra: string
  codigo_contrato: string
  lider: string
}

interface TeamOption {
  id: string
  equipe: string
  codigo_contrato: string
  supervisor: string
}

export default function UsersPage() {
  const { user } = useAuth()
  // TODO: Preencha estes slugs com os valores configurados nas tabelas:
  // - USERS_MODULE_SLUG: coluna "slug" da tabela "modulos" referente ao mdulo de usurios.
  // - *_FUNC_SLUG: coluna "slug" da tabela "modulo_funcionalidades" para cada ao rpida.
  const USERS_MODULE_SLUG = 'usuario'
  const CREATE_USER_FUNC_SLUG = 'criar_usuarios'
  const EXPORT_USERS_FUNC_SLUG = 'exportar_excel_usuarios'
  const EDIT_USER_FUNC_SLUG = 'editar_usuarios'
  const MANAGE_CONTRACTS_FUNC_SLUG = 'editar_contratos_usuarios'
  const MANAGE_FUNCTIONALITIES_FUNC_SLUG = 'editar_funcionalidades_usuarios'
  const DELETE_USER_FUNC_SLUG = 'deletar_usuarios'

  // Hooks de permisses visuais (retornam true enquanto os slugs estiverem vazios).
  const usersModulePermissions = useModuloComFuncionalidades(USERS_MODULE_SLUG)
  const { allowed: canCreateUser, loading: permissionsLoading } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    CREATE_USER_FUNC_SLUG
  )
  const { allowed: canExportUsers } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    EXPORT_USERS_FUNC_SLUG
  )
  const { allowed: canEditUsers } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    EDIT_USER_FUNC_SLUG
  )
  const { allowed: canManageContracts } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    MANAGE_CONTRACTS_FUNC_SLUG
  )
  const { allowed: canManageFunctionalities } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    MANAGE_FUNCTIONALITIES_FUNC_SLUG
  )
  const { allowed: canDeleteUsersByPermissions } = useCanAccessFuncionalidade(
    USERS_MODULE_SLUG,
    DELETE_USER_FUNC_SLUG
  )
  const permissionsLoaded = !!usersModulePermissions && !permissionsLoading
  const availableUsersFunctionalities = usersModulePermissions?.funcionalidades ?? []
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Estados para gerenciamento de contratos
  const [showContractsModal, setShowContractsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [contracts, setContracts] = useState<Contrato[]>([])
  const [userContracts, setUserContracts] = useState<UsuarioContrato[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  // Estados para gerenciamento de funcionalidades
  const [showFunctionalitiesModal, setShowFunctionalitiesModal] = useState(false)
  const [functionalities, setFunctionalities] = useState<Funcionalidade[]>([])
  const [userFunctionalities, setUserFunctionalities] = useState<FuncionalidadeUsuario[]>([])
  const [functionalitiesLoading, setFunctionalitiesLoading] = useState(false)
  // Estados para funcionalidades do usurio logado
  const [currentUserFunctionalities, setCurrentUserFunctionalities] = useState<FuncionalidadeUsuario[]>([])
  // Estados para modal de confirmao de excluso
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
  // Estados para dropdowns dinmicos
  const [availableContracts, setAvailableContracts] = useState<ContractOption[]>([])
  const [availableLetters, setAvailableLetters] = useState<LetterOption[]>([])
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([])
  const [lettersLoading, setLettersLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    matricula: 0,
    senha: '',
    funcao: '',
    contrato_raiz: '',
    phone: '',
    role: 'Usuario',
    status: 'ativo',
    letra_id: '',
    equipe_id: ''
  })

  const authenticatedFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      fetch(input, {
        credentials: 'include',
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        }
      }),
    []
  )

  // Funcao para carregar funcionalidades do usuario logado
  const fetchCurrentUserFunctionalities = useCallback(async () => {
    if (!user?.matricula) return

    try {
      const response = await authenticatedFetch(
        `/api/user-functionalities?matricula=${user.matricula}`
      )

      const data = await response.json()
      
      if (response.ok) {
        setCurrentUserFunctionalities(data.userFunctionalities || [])
      } else {
        console.error('Erro ao carregar funcionalidades do usurio logado:', data.error)
        setCurrentUserFunctionalities([])
      }
    } catch (error) {
      console.error('Erro ao carregar funcionalidades do usurio logado:', error)
      setCurrentUserFunctionalities([])
    }
  }, [authenticatedFetch, user?.matricula])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/users', {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setUsers(data.users || [])
    } catch (error) {
      console.error('Erro ao carregar usurios:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar usurios')
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUser) {
        // Update user
        const updateData: Partial<Usuario> = {
          nome: formData.nome,
          email: formData.email,
          matricula: formData.matricula,
          funcao: formData.funcao,
          contrato_raiz: formData.contrato_raiz,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          letra_id: formData.letra_id || undefined,
          equipe_id: formData.equipe_id || undefined
        }

        if (formData.senha) {
          updateData.password_hash = formData.senha // Hash should be done on server side
        }

        const response = await authenticatedFetch('/api/users', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        })

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.message)
        }
        
        toast.success('Usurio atualizado com sucesso!')
      } else {
        // Create new user
        if (!formData.senha) {
          toast.error('Senha  obrigatria para novos usurios')
          return
        }

        const response = await authenticatedFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            nome: formData.nome,
            email: formData.email,
            matricula: formData.matricula,
            senha: formData.senha!,
            role: formData.role,
            funcao: formData.funcao,
            contrato_raiz: formData.contrato_raiz,
            phone: formData.phone,
            letra_id: formData.letra_id || undefined,
            equipe_id: formData.equipe_id || undefined,
            aceite_termos: true
          })
        })

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.message)
        }
        
        toast.success('Usurio criado com sucesso!')
      }

      setShowModal(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('Erro ao salvar usurio:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usurio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (user: Usuario) => {
    setEditingUser(user)
    setFormData({
      nome: user.nome,
      email: user.email,
      matricula: user.matricula,
      senha: '',
      funcao: user.funcao || '',
      contrato_raiz: user.contrato_raiz || '',
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      letra_id: user.letra_id || '',
      equipe_id: user.equipe_id || ''
    })
    
    // Se o usurio tem um contrato, carregar letras e equipes
    if (user.contrato_raiz) {
      await fetchLettersForContract(user.contrato_raiz)
      await fetchTeamsForContract(user.contrato_raiz)
    }
    
    setShowModal(true)
  }

  const handleDelete = (user: Usuario) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await authenticatedFetch(`/api/users/${userToDelete.matricula}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Erro ao excluir usurio')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      toast.success('Usurio excludo com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir usurio:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir usurio')
    } finally {
      // Sempre fechar o modal e atualizar a lista, independentemente do resultado
      setShowDeleteModal(false)
      setUserToDelete(null)
      fetchUsers()
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      matricula: 0,
      senha: '',
      funcao: '',
      contrato_raiz: '',
      phone: '',
      role: 'Usuario',
      status: 'ativo',
      letra_id: '',
      equipe_id: ''
    })
    setAvailableLetters([])
    setAvailableTeams([])
  }

  // Funes para buscar dados dos dropdowns
  const fetchContractsForDropdown = useCallback(async () => {
    try {
      setContractsLoading(true)
      const response = await authenticatedFetch('/api/users/contracts', {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setAvailableContracts(data.contracts || [])
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error('Erro ao carregar contratos para seleo')
    } finally {
      setContractsLoading(false)
    }
  }, [authenticatedFetch])

  useEffect(() => {
    fetchUsers()
    fetchContractsForDropdown()
  }, [fetchContractsForDropdown, fetchUsers])

  useEffect(() => {
    if (user?.matricula) {
      fetchCurrentUserFunctionalities()
    }
  }, [fetchCurrentUserFunctionalities, user?.matricula])

  const fetchLettersForContract = async (contratoId: string) => {
    if (!contratoId) {
      setAvailableLetters([])
      return
    }

    try {
      setLettersLoading(true)
      const response = await authenticatedFetch(`/api/users/letters?contrato=${contratoId}`, {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setAvailableLetters(data.letters || [])
    } catch (error) {
      console.error('Erro ao carregar letras:', error)
      toast.error('Erro ao carregar letras para seleo')
      setAvailableLetters([])
    } finally {
      setLettersLoading(false)
    }
  }

  const fetchTeamsForContract = async (contratoId: string) => {
    if (!contratoId) {
      setAvailableTeams([])
      return
    }

    try {
      setTeamsLoading(true)
      const response = await authenticatedFetch(`/api/users/teams?contrato=${contratoId}`, {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setAvailableTeams(data.teams || [])
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
      toast.error('Erro ao carregar equipes para seleo')
      setAvailableTeams([])
    } finally {
      setTeamsLoading(false)
    }
  }

  // Funo para lidar com mudana de contrato
  const handleContractChange = (contratoId: string) => {
    setFormData({ 
      ...formData, 
      contrato_raiz: contratoId,
      letra_id: '', // Reset letra quando contrato muda
      equipe_id: '' // Reset equipe quando contrato muda
    })
    
    // Buscar letras e equipes para o novo contrato
    if (contratoId) {
      fetchLettersForContract(contratoId)
      fetchTeamsForContract(contratoId)
    } else {
      setAvailableLetters([])
      setAvailableTeams([])
    }
  }

  // Funes para gerenciamento de contratos
  const handleManageContracts = async (user: Usuario) => {
    // Verificar se o usurio tem matrcula vlida
    if (!user.matricula) {
      toast.error('Matrcula do usurio no encontrada. No  possvel gerenciar contratos.')
      return
    }

    setSelectedUser(user)
    setContractsLoading(true)
    setShowContractsModal(true)
    
    try {
      await Promise.all([
        fetchAllContracts(),
        fetchUserContracts(user.matricula)
      ])
    } catch (error) {
      console.error('Erro ao carregar dados de contratos:', error)
      toast.error('Erro ao carregar contratos')
    } finally {
      setContractsLoading(false)
    }
  }

  const fetchAllContracts = async () => {
    try {
      const response = await authenticatedFetch('/api/contracts', {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setContracts(data.contracts || [])
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      throw error
    }
  }

  const fetchUserContracts = async (matricula: number) => {
    // Verificar se matricula  vlida
    if (!matricula || matricula === undefined) {
      console.error('matricula invlida:', matricula)
      toast.error('Matrcula do usurio invlida')
      setUserContracts([])
      return
    }

    try {
      const response = await authenticatedFetch(`/api/user-contracts?matricula=${matricula}`, {
        method: 'GET'
      })

      const data = await response.json()
      
      if (response.ok) {
        // Mapear os dados para incluir a propriedade 'codigo' baseada em 'codigo_contrato'
        const mappedContracts = (data.userContracts || []).map((uc: UsuarioContrato) => ({
          ...uc,
          codigo: uc.codigo_contrato
        }))
        setUserContracts(mappedContracts)
      } else {
        console.error('Erro ao carregar contratos do usurio:', data.error)
        setUserContracts([])
      }
    } catch (error) {
      console.error('Erro ao carregar contratos do usurio:', error)
      setUserContracts([])
    }
  }

  const handleToggleContractAccess = async (contractId: string, hasAccess: boolean) => {
    if (!selectedUser) return

    try {
      if (hasAccess) {
        // Remover acesso
        const response = await authenticatedFetch(
          `/api/user-contracts?matricula=${selectedUser.matricula}&codigo=${contractId}`,
          {
            method: 'DELETE'
          }
        )

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao remover acesso ao contrato')
        }
        
        toast.success('Acesso ao contrato removido com sucesso!')
      } else {
        // Adicionar acesso
        const response = await authenticatedFetch('/api/user-contracts', {
          method: 'POST',
          body: JSON.stringify({
            matricula: selectedUser.matricula,
            codigo: contractId
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao adicionar acesso ao contrato')
        }
        
        toast.success('Acesso ao contrato adicionado com sucesso!')
      }

      // Recarregar contratos do usurio
      await fetchUserContracts(selectedUser.matricula)
    } catch (error) {
      console.error('Erro ao alterar acesso ao contrato:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar acesso ao contrato')
    }
  }

  const isUserHasContract = (contractId: string) => {
    return userContracts.some(uc => uc.codigo === contractId)
  }

  // Funes para gerenciar funcionalidades
  const handleManageFunctionalities = async (user: Usuario) => {
    if (!user.matricula) {
      toast.error('Matrcula do usurio no encontrada. No  possvel gerenciar funcionalidades.')
      return
    }

    setSelectedUser(user)
    setFunctionalitiesLoading(true)
    setShowFunctionalitiesModal(true)
    
    try {
      await Promise.all([
        fetchAllFunctionalities(),
        fetchUserFunctionalities(user.matricula)
      ])
    } catch (error) {
      console.error('Erro ao carregar dados de funcionalidades:', error)
      toast.error('Erro ao carregar funcionalidades')
    } finally {
      setFunctionalitiesLoading(false)
    }
  }

  const fetchAllFunctionalities = async () => {
    try {
      const response = await authenticatedFetch('/api/functionalities', {
        method: 'GET'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      setFunctionalities(data.functionalities || [])
    } catch (error) {
      console.error('Erro ao carregar funcionalidades:', error)
      throw error
    }
  }

  const fetchUserFunctionalities = async (matricula: number) => {
    if (!matricula || matricula === undefined) {
      console.error('matricula invlida:', matricula)
      toast.error('Matrcula do usurio invlida')
      setUserFunctionalities([])
      return
    }

    try {
      const response = await authenticatedFetch(
        `/api/user-functionalities?matricula=${matricula}`,
        {
          method: 'GET'
        }
      )

      const data = await response.json()
      
      if (response.ok) {
        setUserFunctionalities(data.userFunctionalities || [])
      } else {
        console.error('Erro ao carregar funcionalidades do usurio:', data.error)
        setUserFunctionalities([])
      }
    } catch (error) {
      console.error('Erro ao carregar funcionalidades do usurio:', error)
      setUserFunctionalities([])
    }
  }

  const handleToggleFunctionalityAccess = async (functionalityId: string, hasAccess: boolean) => {
    if (!selectedUser) return

    try {
      if (hasAccess) {
        // Remover acesso
        const response = await authenticatedFetch('/api/user-functionalities', {
          method: 'DELETE',
          body: JSON.stringify({
            matricula_usuario: selectedUser.matricula,
            funcionalidade_id: functionalityId
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao remover acesso  funcionalidade')
        }
        
        toast.success('Acesso  funcionalidade removido com sucesso!')
      } else {
        // Adicionar acesso
        const response = await authenticatedFetch('/api/user-functionalities', {
          method: 'POST',
          body: JSON.stringify({
            matricula_usuario: selectedUser.matricula,
            funcionalidade_id: functionalityId
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao adicionar acesso  funcionalidade')
        }
        
        toast.success('Acesso  funcionalidade adicionado com sucesso!')
      }

      // Recarregar funcionalidades do usurio
      await fetchUserFunctionalities(selectedUser.matricula)
    } catch (error) {
      console.error('Erro ao alterar acesso  funcionalidade:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar acesso  funcionalidade')
    }
  }

  const isUserHasFunctionality = (functionalityId: string) => {
    return userFunctionalities.some(uf => uf.funcionalidade_id === functionalityId)
  }



  // Funo para verificar se o usurio logado tem uma funcionalidade especfica
  const currentUserHasFunctionality = (functionalityNameOrId: string) => {
    return currentUserFunctionalities.some(uf => {
      // Verifica se  um ID (formato UUID)
      if (functionalityNameOrId.includes('-') && functionalityNameOrId.length === 36) {
        return uf.funcionalidade_id === functionalityNameOrId
      }
      // Caso contrrio, verifica pelo nome
      return uf.funcionalidade?.nome?.toLowerCase().includes(functionalityNameOrId.toLowerCase())
    })
  }

  // Verificar se o usurio logado pode deletar usurios
  const canDeleteUsers = currentUserHasFunctionality('f98bff3d-38e2-4af1-b9c3-8ed1487ad39a') && canDeleteUsersByPermissions

  const filteredUsers = users.filter(user =>
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.matricula.toString().includes(searchTerm.toLowerCase())
  )

  const groupedFunctionalities = useMemo(() => {
    const groups: Record<string, Funcionalidade[]> = {}
    functionalities.forEach((func) => {
      const groupName = (func as unknown as { modulos?: { nome?: string } }).modulos?.nome || 'Outros mdulos'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(func)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleName, items]) => ({
        moduleName,
        items: items.sort((a, b) => a.nome.localeCompare(b.nome))
      }))
  }, [functionalities])

  // Funo para exportar dados para Excel
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Usurios')

      // Definir cabealhos
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Matrcula', key: 'matricula', width: 12 },
        { header: 'Funo', key: 'funcao', width: 20 },
        { header: 'Contrato Raiz', key: 'contrato_raiz', width: 15 },
        { header: 'Role', key: 'role', width: 10 },
        { header: 'Status', key: 'status', width: 10 }
      ]

      // Adicionar dados
      filteredUsers.forEach(user => {
        worksheet.addRow({
          nome: user.nome,
          email: user.email,
          matricula: user.matricula,
          funcao: user.funcao || '-',
          contrato_raiz: user.contrato_raiz || '-',
          role: user.role === 'Admin' ? 'Admin' : user.role === 'Editor' ? 'Editor' : 'Usurio',
          status: user.status === 'ativo' ? 'Ativo' : 'Inativo'
        })
      })

      // Estilizar cabealho
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Gerar nome do arquivo com timestamp
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const fileName = `usuarios_${timestamp}.xlsx`
      link.download = fileName
      
      link.click()
      window.URL.revokeObjectURL(url)
      
      toast.success(`Arquivo ${fileName} exportado com sucesso!`)
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error)
      toast.error('Erro ao exportar dados para Excel')
    }
  }

  if (!user || user.role === 'Usuario') {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar usurios.</p>
        </div>
    )
  }

  return (
      <div className="space-y-6" data-allowed-functionalities-count={availableUsersFunctionalities.length}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Usurios</h1>
          <div className="flex gap-3">
            {permissionsLoaded && canExportUsers && (
              <>
                {/* TODO: Vincule este boto  funcionalidade de exportar usurios preenchendo EXPORT_USERS_FUNC_SLUG. */}
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  title="Exportar lista de usurios para Excel"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
              </>
            )}
            {permissionsLoaded && canCreateUser && (
              <>
                {/* TODO: Vincule este boto  funcionalidade de criao preenchendo CREATE_USER_FUNC_SLUG. */}
                <button
                  onClick={() => {
                    setEditingUser(null)
                    resetForm()
                    setShowModal(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Novo Usurio
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar usurios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Matrcula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Funo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contrato Raiz</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aes</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Nenhum usurio encontrado
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.matricula} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.matricula}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.funcao || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {user.contrato_raiz || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          user.role === 'Editor' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.role === 'Admin' ? 'Admin' : user.role === 'Editor' ? 'Editor' : 'Usurio'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {canEditUsers && (
  <>
    {/* TODO: Vincule este boto  funcionalidade de edio preenchendo EDIT_USER_FUNC_SLUG. */}
    <button
      onClick={() => handleEdit(user)}
      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
      title="Editar usurio"
    >
      <Edit className="h-4 w-4" />
    </button>
  </>
)}
                          {canManageContracts && (
  <>
    {/* TODO: Vincule este boto  funcionalidade de gesto de contratos preenchendo MANAGE_CONTRACTS_FUNC_SLUG. */}
    <button
      onClick={() => handleManageContracts(user)}
      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
      title="Gerenciar contratos"
    >
      <Settings className="h-4 w-4" />
    </button>
  </>
)}
                          {canManageFunctionalities && (
  <>
    {/* TODO: Vincule este boto  funcionalidade de gesto de funcionalidades preenchendo MANAGE_FUNCTIONALITIES_FUNC_SLUG. */}
    <button
      onClick={() => handleManageFunctionalities(user)}
      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
      title="Gerenciar funcionalidades"
    >
      <Shield className="h-4 w-4" />
    </button>
  </>
)}
                          {canDeleteUsers && (
  <>
    {/* TODO: Vincule este boto  funcionalidade de excluso preenchendo DELETE_USER_FUNC_SLUG. */}
    <button
      onClick={() => handleDelete(user)}
      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
      title="Excluir usurio"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </>
)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Gerenciamento de Funcionalidades */}
        {showFunctionalitiesModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Gerenciar Funcionalidades - {selectedUser.nome}
                  </h2>
                  <button
                    onClick={() => {
                      setShowFunctionalitiesModal(false)
                      setSelectedUser(null)
                      setFunctionalities([])
                      setUserFunctionalities([])
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    
                  </button>
                </div>

                {functionalitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Carregando funcionalidades...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Selecione as funcionalidades que o usurio deve ter acesso:
                    </div>
                    
                    {functionalities.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nenhuma funcionalidade encontrada
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {groupedFunctionalities.map(({ moduleName, items }) => (
                          <div key={moduleName} className="space-y-2">
                            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-1">
                              {moduleName}
                            </div>
                            <div className="space-y-2">
                              {items.map((functionality) => {
                                const hasAccess = isUserHasFunctionality(functionality.id)
                                return (
                                  <div
                                    key={functionality.id}
                                    className="grid grid-cols-[1fr_auto] gap-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="font-medium text-gray-900 dark:text-white break-words text-wrap">
                                        {functionality.nome}
                                      </div>
                                      {functionality.descricao && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 break-words text-wrap leading-relaxed">
                                          Descrio: {functionality.descricao}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-400 dark:text-gray-500">
                                        Status: {functionality.ativa ? 'Ativo' : 'Inativo'}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center space-y-2">
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={hasAccess}
                                          onChange={() => handleToggleFunctionalityAccess(functionality.id, hasAccess)}
                                          className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                      </label>
                                      <span className="text-xs text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">
                                        {hasAccess ? 'Tem acesso' : 'Sem acesso'}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Resumo:</strong> {selectedUser.nome} tem acesso a {userFunctionalities.length} de {functionalities.length} funcionalidades disponveis.
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          setShowFunctionalitiesModal(false)
                          setSelectedUser(null)
                          setFunctionalities([])
                          setUserFunctionalities([])
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingUser ? 'Editar Usurio' : 'Novo Usurio'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Matrcula *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Senha {!editingUser && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formData.senha}
                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Funo
                    </label>
                    <input
                      type="text"
                      value={formData.funcao}
                      onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contrato Raiz
                    </label>
                    <select
                      value={formData.contrato_raiz}
                      onChange={(e) => handleContractChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={contractsLoading}
                    >
                      <option value="">Selecione um contrato</option>
                      {availableContracts.map((contract) => (
                        <option key={contract.codigo} value={contract.codigo}>
                          {contract.nome} ({contract.codigo})
                        </option>
                      ))}
                    </select>
                    {contractsLoading && (
                      <div className="text-xs text-gray-500 mt-1">Carregando contratos...</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Letra
                    </label>
                    <select
                      value={formData.letra_id}
                      onChange={(e) => setFormData({ ...formData, letra_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={lettersLoading || !formData.contrato_raiz}
                    >
                      <option value="">Selecione uma letra</option>
                      {availableLetters.map((letter) => (
                        <option key={letter.id} value={letter.id}>
                          {letter.letra} - Lder: {letter.lider}
                        </option>
                      ))}
                    </select>
                    {lettersLoading && (
                      <div className="text-xs text-gray-500 mt-1">Carregando letras...</div>
                    )}
                    {!formData.contrato_raiz && (
                      <div className="text-xs text-gray-500 mt-1">Selecione um contrato primeiro</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Equipe
                    </label>
                    <select
                      value={formData.equipe_id}
                      onChange={(e) => setFormData({ ...formData, equipe_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={teamsLoading || !formData.contrato_raiz}
                    >
                      <option value="">Selecione uma equipe</option>
                      {availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.equipe} - Supervisor: {team.supervisor}
                        </option>
                      ))}
                    </select>
                    {teamsLoading && (
                      <div className="text-xs text-gray-500 mt-1">Carregando equipes...</div>
                    )}
                    {!formData.contrato_raiz && (
                      <div className="text-xs text-gray-500 mt-1">Selecione um contrato primeiro</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'Admin' | 'Editor' | 'Usuario' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Usuario">Usurio</option>
                      <option value="Editor">Editor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingUser(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      {editingUser ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Gerenciamento de Contratos */}
        {showContractsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Gerenciar Contratos - {selectedUser.nome}
                  </h2>
                  <button
                    onClick={() => {
                      setShowContractsModal(false)
                      setSelectedUser(null)
                      setContracts([])
                      setUserContracts([])
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    
                  </button>
                </div>

                {contractsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Carregando contratos...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Selecione os contratos que o usurio deve ter acesso:
                    </div>
                    
                    {contracts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nenhum contrato encontrado
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {contracts.map((contract) => {
                          const hasAccess = isUserHasContract(contract.codigo)
                          return (
                            <div
                              key={contract.codigo}
                              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {contract.nome}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Cdigo: {contract.codigo}
                                  {contract.local && `  Local: ${contract.local}`}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  Status: {contract.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasAccess}
                                    onChange={() => handleToggleContractAccess(contract.codigo, hasAccess)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                  {hasAccess ? 'Tem acesso' : 'Sem acesso'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Resumo:</strong> {selectedUser.nome} tem acesso a {userContracts.length} de {contracts.length} contratos disponveis.
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          setShowContractsModal(false)
                          setSelectedUser(null)
                          setContracts([])
                          setUserContracts([])
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmao de Excluso */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Confirmar Excluso
                    </h3>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Tem certeza que deseja excluir o usurio abaixo? Esta ao no pode ser desfeita.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {userToDelete.nome}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Matrcula: {userToDelete.matricula}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Email: {userToDelete.email}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Funo: {userToDelete.funcao}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setUserToDelete(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Confirmar Excluso
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}


















