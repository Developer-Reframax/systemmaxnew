'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
// Removed direct Supabase import - using API routes instead
import { User, Mail, Phone, MapPin, Calendar, Edit3, Save, X, Camera, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  nome: string
  email: string
  telefone: string
  endereco: string
  data_nascimento: string
  bio: string
  avatar_url?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: '',
    bio: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }
      
      const response = await fetch(`/api/users/${user.matricula}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar perfil')
      }
      
      const data = await response.json()
      
      setProfile({
        nome: data.nome || '',
        email: data.email || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        data_nascimento: data.data_nascimento || '',
        bio: data.bio || ''
      })
      
      if (data.avatar_url) {
        setAvatarPreview(data.avatar_url)
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('A imagem deve ter no máximo 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida')
        return
      }
      
      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return null
      }
      
      const formData = new FormData()
      formData.append('avatar', avatarFile)
      formData.append('matricula', user.matricula.toString())
      
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Erro ao fazer upload do avatar')
      }
      
      const data = await response.json()
      return data.avatar_url
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error)
      toast.error('Erro ao fazer upload da imagem')
      return null
    }
  }

  const saveProfile = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }
      
      let avatarUrl = profile.avatar_url
      
      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }
      
      const response = await fetch(`/api/users/${user.matricula}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: profile.nome,
          telefone: profile.telefone,
          endereco: profile.endereco,
          data_nascimento: profile.data_nascimento,
          bio: profile.bio,
          avatar_url: avatarUrl
        })
      })
      
      if (!response.ok) {
        throw new Error('Erro ao salvar perfil')
      }
      
      // Profile updated successfully
      setIsEditing(false)
      setAvatarFile(null)
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(profile.avatar_url || null)
    loadProfile() // Reload original data
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{profile.nome || 'Nome não informado'}</h2>
                <p className="text-blue-100">{profile.email}</p>
                <div className="flex items-center mt-2">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {user?.role === 'Admin' ? 'Administrador' : user?.role === 'Editor' ? 'Editor' : 'Usuário'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações Pessoais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Nome Completo
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.nome}
                      onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Digite seu nome completo"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.nome || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                    {profile.email || 'Não informado'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    O email não pode ser alterado pelo usuário
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Telefone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.telefone}
                      onChange={(e) => setProfile(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="(11) 99999-9999"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.telefone || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Data de Nascimento
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profile.data_nascimento}
                      onChange={(e) => setProfile(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div>
                      <p className="text-gray-900 dark:text-white">{formatDate(profile.data_nascimento)}</p>
                      {profile.data_nascimento && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {calculateAge(profile.data_nascimento)} anos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações Adicionais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Endereço
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profile.endereco}
                      onChange={(e) => setProfile(prev => ({ ...prev, endereco: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Digite seu endereço completo"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {profile.endereco || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Biografia
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Conte um pouco sobre você..."
                      maxLength={500}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {profile.bio || 'Nenhuma biografia adicionada'}
                    </p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {profile.bio.length}/500 caracteres
                    </p>
                  )}
                </div>

                {/* Account Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Informações da Conta</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Matrícula: {user?.matricula}</p>
                    <p>Membro desde: Não disponível</p>
                    <p>Último acesso: Não disponível</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
