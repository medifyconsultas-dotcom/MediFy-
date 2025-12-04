import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import Layout from '@/components/Layout'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { User as UserIcon, Save, Mail, Phone, MapPin, Building2, Briefcase, LogOut, RefreshCw, Sun, Moon } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { toast } from '@/components/Toast'
import { validateCNPJ, formatCNPJ, formatPhoneBR, formatCRM } from '@/utils/validators'
import { corrigirEspecialidade } from '@/utils/especialidades'
import { useNavigate } from 'react-router-dom'
import ImageUpload from '@/components/ImageUpload'
import { uploadImageLocal, deleteImageLocal, getStoragePath } from '@/utils/imageUploadLocal'

export default function Perfil() {
  const { userProfile, currentUser, logout, reloadProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadingProfile, setReloadingProfile] = useState(false)
  const [freshProfile, setFreshProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    nomeFantasia: '',
    cnpj: '',
    especialidade: '',
    crm: '',
    biografia: '',
  })
  const [fotoURL, setFotoURL] = useState<string | undefined>(userProfile?.fotoURL || (userProfile as any)?.foto)

  // Função para carregar dados atualizados do Firestore
  const loadFreshProfile = async () => {
    if (!userProfile || !currentUser) return

    setLoading(true)
    try {
      // Determinar a coleção baseado no perfil
      let collectionName: string = userProfile.perfil
      if (userProfile.perfil === 'clinica') {
        collectionName = 'clinicas'
      } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
        collectionName = 'funcionarios'
      } else if (userProfile.perfil === 'profissional') {
        collectionName = 'profissionais'
      } else if (userProfile.perfil === 'paciente') {
        collectionName = 'pacientes'
      }

      // Buscar dados atualizados do Firestore
      const profileDoc = await getDoc(doc(db, collectionName, userProfile.id))
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data()
        setFreshProfile(profileData)
        
        const telefoneSalvo = profileData.telefone || ''
        setFormData({
          nome: profileData.nome || '',
          email: profileData.email || userProfile.email || '',
          telefone: telefoneSalvo ? formatPhoneBR(telefoneSalvo) : '',
          endereco: profileData.endereco || '',
          nomeFantasia: profileData.nomeFantasia || '',
          cnpj: profileData.cnpj ? formatCNPJ(profileData.cnpj) : '',
          especialidade: profileData.especialidade || '',
          crm: profileData.crm ? formatCRM(profileData.crm) : '',
          biografia: profileData.bio || profileData.biografia || profileData.descricao || profileData.descrição || '',
        })
        setFotoURL(profileData.fotoURL || profileData.foto || undefined)
      } else {
        // Se não encontrar, usar dados do contexto
        const telefoneSalvo = (userProfile as any).telefone || ''
        setFormData({
          nome: userProfile.nome || '',
          email: userProfile.email || '',
          telefone: telefoneSalvo ? formatPhoneBR(telefoneSalvo) : '',
          endereco: (userProfile as any).endereco || '',
          nomeFantasia: (userProfile as any).nomeFantasia || '',
          cnpj: (userProfile as any).cnpj ? formatCNPJ((userProfile as any).cnpj) : '',
          especialidade: (userProfile as any).especialidade || '',
          crm: (userProfile as any).crm ? formatCRM((userProfile as any).crm) : '',
          biografia: (userProfile as any).bio || (userProfile as any).biografia || (userProfile as any).descricao || (userProfile as any).descrição || '',
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast.error('Erro ao carregar dados do perfil')
      // Em caso de erro, usar dados do contexto
      const telefoneSalvo = (userProfile as any).telefone || ''
      setFormData({
        nome: userProfile.nome || '',
        email: userProfile.email || '',
        telefone: telefoneSalvo ? formatPhoneBR(telefoneSalvo) : '',
        endereco: (userProfile as any).endereco || '',
        nomeFantasia: (userProfile as any).nomeFantasia || '',
        cnpj: (userProfile as any).cnpj ? formatCNPJ((userProfile as any).cnpj) : '',
          especialidade: (userProfile as any).especialidade || '',
          crm: (userProfile as any).crm || '',
          biografia: (userProfile as any).bio || (userProfile as any).biografia || (userProfile as any).descricao || (userProfile as any).descrição || '',
        })
      setFotoURL(userProfile.fotoURL || (userProfile as any).foto || undefined)
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados atualizados sempre que entrar na página
  useEffect(() => {
    if (userProfile && currentUser) {
      loadFreshProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando o ID do perfil mudar (ao entrar na página)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || !currentUser) return

    // Validações
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (userProfile.perfil === 'clinica' && formData.cnpj) {
      const cleanCNPJ = formData.cnpj.replace(/\D/g, '')
      if (cleanCNPJ && !validateCNPJ(cleanCNPJ)) {
        toast.error('CNPJ inválido')
        return
      }
    }

    setSaving(true)
    try {
      // Determinar a coleção baseado no perfil
      let collectionName: string = userProfile.perfil
      if (userProfile.perfil === 'clinica') {
        collectionName = 'clinicas'
      } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
        collectionName = 'funcionarios'
      } else if (userProfile.perfil === 'profissional') {
        collectionName = 'profissionais'
      }

      const updateData: any = {
        nome: formData.nome,
        telefone: formData.telefone,
      }

      // Incluir fotoURL se existir
      if (fotoURL) {
        updateData.fotoURL = fotoURL
        // Manter compatibilidade com campo 'foto' também
        updateData.foto = fotoURL
      }

      if (userProfile.perfil === 'clinica') {
        updateData.nomeFantasia = formData.nomeFantasia
        updateData.endereco = formData.endereco
        if (formData.cnpj) {
          updateData.cnpj = formData.cnpj.replace(/\D/g, '')
        }
      }

      if (userProfile.perfil === 'profissional') {
        // Corrigir especialidade antes de salvar
        const especialidadeCorrigida = formData.especialidade 
          ? (corrigirEspecialidade(formData.especialidade) || formData.especialidade)
          : formData.especialidade
        updateData.especialidade = especialidadeCorrigida
        updateData.crm = formData.crm
        updateData.endereco = formData.endereco
        // Salvar biografia como bio, biografia e descricao para compatibilidade
        if (formData.biografia) {
          updateData.bio = formData.biografia
          updateData.biografia = formData.biografia
          updateData.descricao = formData.biografia
          updateData.descrição = formData.biografia
        }
      }

      if (userProfile.perfil === 'medico') {
        // Corrigir especialidade antes de salvar
        const especialidadeCorrigida = formData.especialidade 
          ? (corrigirEspecialidade(formData.especialidade) || formData.especialidade)
          : formData.especialidade
        updateData.especialidade = especialidadeCorrigida
        // Salvar CRM removendo formatação e aplicando formato correto
        if (formData.crm) {
          const crmClean = formData.crm.replace(/\D/g, '')
          updateData.crm = crmClean.length > 5 ? `${crmClean.slice(0, 5)}-${crmClean.slice(5)}` : crmClean
        }
        // Salvar biografia como bio, biografia e descricao para compatibilidade
        if (formData.biografia) {
          updateData.bio = formData.biografia
          updateData.biografia = formData.biografia
          updateData.descricao = formData.biografia
          updateData.descrição = formData.biografia
        }
      }

      // Atualizar no Firestore
      await updateDoc(doc(db, collectionName, userProfile.id), updateData)

      // Atualizar o perfil do Firebase Auth se o nome mudou
      if (formData.nome !== (freshProfile?.nome || userProfile.nome)) {
        await updateProfile(currentUser, { displayName: formData.nome })
      }

      // Recarregar dados atualizados após salvar
      await loadFreshProfile()
      
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  if (!userProfile || loading) {
    return (
      <Layout currentProfile={userProfile?.perfil || "clinica"}>
        <div className="loading-state">Carregando perfil...</div>
      </Layout>
    )
  }

  return (
    <Layout currentProfile={userProfile.perfil}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="perfil-container"
      >
        <div className="page-header">
          <h1>
            <UserIcon size={28} />
            Meu Perfil
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="perfil-card"
        >
          <form onSubmit={handleSubmit} className="perfil-form">
            <div className="form-section">
              <h2>Foto de Perfil</h2>
              <ImageUpload
                currentImageUrl={fotoURL}
                onUpload={async (file) => {
                  const path = getStoragePath(userProfile.perfil)
                  // Usar upload local (base64) ao invés de Firebase Storage
                  const url = await uploadImageLocal(file, path, userProfile.id)
                  setFotoURL(url)
                  
                  // Atualizar no Firestore imediatamente com base64
                  let collectionName: string = userProfile.perfil
                  if (userProfile.perfil === 'clinica') {
                    collectionName = 'clinicas'
                  } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
                    collectionName = 'funcionarios'
                  } else if (userProfile.perfil === 'profissional') {
                    collectionName = 'profissionais'
                  }
                  
                  await updateDoc(doc(db, collectionName, userProfile.id), {
                    fotoURL: url,
                    foto: url, // Compatibilidade
                  })
                  
                  return url
                }}
                onRemove={async () => {
                  // Atualizar no Firestore primeiro (para remover a referência)
                  let collectionName: string = userProfile.perfil
                  if (userProfile.perfil === 'clinica') {
                    collectionName = 'clinicas'
                  } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
                    collectionName = 'funcionarios'
                  } else if (userProfile.perfil === 'profissional') {
                    collectionName = 'profissionais'
                  }
                  
                  try {
                    await updateDoc(doc(db, collectionName, userProfile.id), {
                      fotoURL: null,
                      foto: null,
                    })
                    
                    // Para base64, não há nada a deletar do storage
                    // A imagem será removida do Firestore quando o campo for limpo
                    if (fotoURL) {
                      try {
                        await deleteImageLocal(fotoURL)
                      } catch (error) {
                        console.warn('Erro ao deletar imagem (não crítico):', error)
                      }
                    }
                    
                    setFotoURL(undefined)
                    
                    // Recarregar perfil
                    await reloadProfile()
                  } catch (error: any) {
                    console.error('Erro ao remover foto:', error)
                    throw error
                  }
                }}
                maxSizeMB={5}
              />
            </div>

            <div className="form-section">
              <h2>Preferências de Tema</h2>
              <div className="form-group">
                <label>
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  Tema da Interface
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <motion.button
                    type="button"
                    onClick={async () => {
                      setTheme('light')
                      if (userProfile) {
                        try {
                          let collectionName: string = userProfile.perfil
                          if (userProfile.perfil === 'clinica') {
                            collectionName = 'clinicas'
                          } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
                            collectionName = 'funcionarios'
                          } else if (userProfile.perfil === 'profissional') {
                            collectionName = 'profissionais'
                          } else if (userProfile.perfil === 'paciente') {
                            collectionName = 'pacientes'
                          }
                          await updateDoc(doc(db, collectionName, userProfile.id), { tema: 'light' })
                          if (reloadProfile) await reloadProfile()
                          toast.success('Tema claro aplicado')
                        } catch (error) {
                          console.error('Erro ao salvar tema:', error)
                          toast.error('Erro ao salvar preferência de tema')
                        }
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      background: theme === 'light' ? 'var(--color-primary-medico)' : 'var(--color-surface-elevated)',
                      border: `1px solid ${theme === 'light' ? 'var(--color-primary-medico)' : 'var(--color-border)'}`,
                      borderRadius: '0.5rem',
                      color: theme === 'light' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Sun size={20} />
                    Claro
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={async () => {
                      setTheme('dark')
                      if (userProfile) {
                        try {
                          let collectionName: string = userProfile.perfil
                          if (userProfile.perfil === 'clinica') {
                            collectionName = 'clinicas'
                          } else if (userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') {
                            collectionName = 'funcionarios'
                          } else if (userProfile.perfil === 'profissional') {
                            collectionName = 'profissionais'
                          } else if (userProfile.perfil === 'paciente') {
                            collectionName = 'pacientes'
                          }
                          await updateDoc(doc(db, collectionName, userProfile.id), { tema: 'dark' })
                          if (reloadProfile) await reloadProfile()
                          toast.success('Tema escuro aplicado')
                        } catch (error) {
                          console.error('Erro ao salvar tema:', error)
                          toast.error('Erro ao salvar preferência de tema')
                        }
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      background: theme === 'dark' ? 'var(--color-primary-medico)' : 'var(--color-surface-elevated)',
                      border: `1px solid ${theme === 'dark' ? 'var(--color-primary-medico)' : 'var(--color-border)'}`,
                      borderRadius: '0.5rem',
                      color: theme === 'dark' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Moon size={20} />
                    Escuro
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Informações Básicas</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <UserIcon size={16} />
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="disabled"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Phone size={16} />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => {
                      const formatted = formatPhoneBR(e.target.value)
                      setFormData({ ...formData, telefone: formatted })
                    }}
                    placeholder="55 (13) 97809-1126"
                    maxLength={18}
                  />
                </div>

                {userProfile.perfil === 'clinica' && (
                  <>
                    <div className="form-group">
                      <label>
                        <Building2 size={16} />
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={formData.nomeFantasia}
                        onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Briefcase size={16} />
                        CNPJ
                      </label>
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <MapPin size={16} />
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {userProfile.perfil === 'profissional' && (
                  <>
                    <div className="form-group">
                      <label>
                        <Briefcase size={16} />
                        Especialidade
                      </label>
                      <input
                        type="text"
                        value={formData.especialidade}
                        onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                        onBlur={(e) => {
                          const valor = e.target.value.trim()
                          if (valor) {
                            const corrigida = corrigirEspecialidade(valor)
                            if (corrigida && corrigida !== valor) {
                              setFormData({ ...formData, especialidade: corrigida })
                              toast.info(`Especialidade corrigida para: ${corrigida}`)
                            }
                          }
                        }}
                        placeholder="Ex: Cardiologia, Pediatria, Ortopedia..."
                        list="especialidades-list"
                      />
                      <datalist id="especialidades-list">
                        {['Cardiologia', 'Dermatologia', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Clínica Geral'].map(esp => (
                          <option key={esp} value={esp} />
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group">
                      <label>
                        <Briefcase size={16} />
                        CRM
                      </label>
                      <input
                        type="text"
                        value={formData.crm}
                        onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <MapPin size={16} />
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        placeholder="Ex: Rua, número, bairro, cidade - UF"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <Briefcase size={16} />
                        Biografia / Descrição
                      </label>
                      <textarea
                        value={formData.biografia}
                        onChange={(e) => setFormData({ ...formData, biografia: e.target.value })}
                        placeholder="Conte um pouco sobre sua experiência e especializações. Esta descrição aparecerá no seu perfil para os pacientes."
                        rows={5}
                        style={{
                          padding: '0.875rem',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '0.5rem',
                          color: 'var(--color-text)',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '120px',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--color-primary-medico)'
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--color-border)'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  </>
                )}

                {(userProfile.perfil === 'medico' || userProfile.perfil === 'recepcionista') && userProfile.perfil === 'medico' && (
                  <>
                    <div className="form-group">
                      <label>
                        <Briefcase size={16} />
                        Especialidade
                      </label>
                      <input
                        type="text"
                        value={formData.especialidade}
                        onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                        onBlur={(e) => {
                          const valor = e.target.value.trim()
                          if (valor) {
                            const corrigida = corrigirEspecialidade(valor)
                            if (corrigida && corrigida !== valor) {
                              setFormData({ ...formData, especialidade: corrigida })
                              toast.info(`Especialidade corrigida para: ${corrigida}`)
                            }
                          }
                        }}
                        placeholder="Ex: Cardiologia, Pediatria, Ortopedia..."
                        list="especialidades-list-medico"
                      />
                      <datalist id="especialidades-list-medico">
                        {['Cardiologia', 'Dermatologia', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Clínica Geral'].map(esp => (
                          <option key={esp} value={esp} />
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group">
                      <label>
                        <Briefcase size={16} />
                        CRM
                      </label>
                      <input
                        type="text"
                        value={formData.crm}
                        onChange={(e) => {
                          const formatted = formatCRM(e.target.value)
                          setFormData({ ...formData, crm: formatted })
                        }}
                        placeholder="XXXXX ou XXXXX-XX"
                        maxLength={8}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <Briefcase size={16} />
                        Biografia / Descrição
                      </label>
                      <textarea
                        value={formData.biografia}
                        onChange={(e) => setFormData({ ...formData, biografia: e.target.value })}
                        placeholder="Conte um pouco sobre sua experiência e especializações. Esta descrição aparecerá no seu perfil para os pacientes."
                        rows={5}
                        style={{
                          padding: '0.875rem',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '0.5rem',
                          color: 'var(--color-text)',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '120px',
                          transition: 'all 0.2s',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--color-primary-medico)'
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--color-border)'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="form-actions">
              <div className="form-actions-left">
                <motion.button
                  type="button"
                  onClick={async () => {
                    try {
                      setReloadingProfile(true)
                      await reloadProfile()
                      await loadFreshProfile()
                      toast.success('Perfil recarregado com sucesso!')
                    } catch (error: any) {
                      toast.error('Erro ao recarregar perfil')
                      console.error('Erro ao recarregar perfil:', error)
                    } finally {
                      setReloadingProfile(false)
                    }
                  }}
                  disabled={reloadingProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="reload-button"
                >
                  <RefreshCw size={18} className={reloadingProfile ? 'spinning' : ''} />
                  {reloadingProfile ? 'Recarregando...' : 'Recarregar Perfil'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={async () => {
                    try {
                      await logout()
                      toast.success('Logout realizado com sucesso!')
                      navigate('/login')
                    } catch (error: any) {
                      toast.error('Erro ao fazer logout')
                      console.error('Erro ao fazer logout:', error)
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="logout-button"
                >
                  <LogOut size={18} />
                  Sair
                </motion.button>
              </div>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="save-button"
              >
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      <style>{`
        .perfil-container {
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .perfil-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .perfil-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--color-border);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group input {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group input:disabled,
        .form-group input.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid var(--color-border);
          gap: 1rem;
        }

        .form-actions-left {
          display: flex;
          gap: 0.75rem;
        }

        .save-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          color: var(--color-error);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-button:hover {
          background: rgba(239, 68, 68, 0.2);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .reload-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          color: #3b82f6;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reload-button:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .reload-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
        }
      `}</style>
    </Layout>
  )
}

