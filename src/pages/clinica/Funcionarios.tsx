import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Funcionario } from '@/types'
import { Users, Plus, Edit2, Trash2, X, Save, UserCheck, UserX, Stethoscope } from 'lucide-react'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { toast } from '@/components/Toast'
import { useConfirmDialog } from '@/utils/confirmDialog'
import { validateEmail, formatPhoneBR, formatCRM } from '@/utils/validators'
import { corrigirEspecialidade } from '@/utils/especialidades'

export default function Funcionarios() {
  const { userProfile } = useAuth()
  const { confirm, DialogComponent } = useConfirmDialog()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    cargo: 'recepcionista' as 'recepcionista' | 'medico',
    especialidade: '',
    crm: '',
  })

  useEffect(() => {
    if (userProfile) {
      loadFuncionarios()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  const loadFuncionarios = async () => {
    if (!userProfile || userProfile.perfil !== 'clinica') return

    setLoading(true)
    try {
      const funcionariosRef = collection(db, 'funcionarios')
      const funcionariosQuery = query(funcionariosRef, where('idClinica', '==', userProfile.id))
      const funcionariosSnap = await getDocs(funcionariosQuery)
      const funcionariosData = funcionariosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate() || new Date(),
      })) as Funcionario[]
      setFuncionarios(funcionariosData)
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || userProfile.perfil !== 'clinica') return

    // Validações
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error('Email inválido')
      return
    }

    if (!editingFuncionario && !formData.senha) {
      toast.error('Senha é obrigatória para novos funcionários')
      return
    }

    if (!editingFuncionario && formData.senha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      if (editingFuncionario) {
        // Editar funcionário existente
        const updateData: any = {
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          cargo: formData.cargo,
          perfil: formData.cargo,
        }
        
        // Adicionar especialidade e CRM apenas se for médico (já corrigida no onBlur)
        if (formData.cargo === 'medico') {
          if (formData.especialidade) {
            // Garantir que a especialidade está corrigida antes de salvar
            const especialidadeCorrigida = corrigirEspecialidade(formData.especialidade) || formData.especialidade
            updateData.especialidade = especialidadeCorrigida
          }
          if (formData.crm) {
            // Salvar CRM removendo formatação
            const crmClean = formData.crm.replace(/\D/g, '')
            updateData.crm = crmClean.length > 5 ? `${crmClean.slice(0, 5)}-${crmClean.slice(5)}` : crmClean
          }
        } else if (formData.cargo === 'recepcionista') {
          // Remover especialidade e CRM se mudou para recepcionista
          updateData.especialidade = null
          updateData.crm = null
        }
        
        await updateDoc(doc(db, 'funcionarios', editingFuncionario.id), updateData)
      } else {
        // Salvar informações da clínica antes de criar o funcionário
        const clinicaEmail = userProfile.email
        const clinicaId = userProfile.id
        
        // Criar novo funcionário
        // Nota: createUserWithEmailAndPassword faz login automático com o novo usuário
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha)
        const user = userCredential.user

        // IMPORTANTE: Usar setDoc com o UID como ID do documento para que o perfil seja encontrado no login
        const funcionarioData: any = {
          id: user.uid,
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          cargo: formData.cargo,
          perfil: formData.cargo,
          idClinica: userProfile.id,
          dataCriacao: Timestamp.now(),
        }
        
        // Adicionar especialidade e CRM apenas se for médico (já corrigida no onBlur)
        if (formData.cargo === 'medico') {
          if (formData.especialidade) {
            // Garantir que a especialidade está corrigida antes de salvar
            const especialidadeCorrigida = corrigirEspecialidade(formData.especialidade) || formData.especialidade
            funcionarioData.especialidade = especialidadeCorrigida
          }
          if (formData.crm) {
            // Salvar CRM removendo formatação
            const crmClean = formData.crm.replace(/\D/g, '')
            funcionarioData.crm = crmClean.length > 5 ? `${crmClean.slice(0, 5)}-${crmClean.slice(5)}` : crmClean
          }
        }
        
        await setDoc(doc(db, 'funcionarios', user.uid), funcionarioData)

        // Salvar flag temporária para indicar que acabamos de criar um funcionário
        // Isso será usado no Dashboard para fazer logout automaticamente
        sessionStorage.setItem('creatingFuncionario', 'true')
        sessionStorage.setItem('clinicaEmail', clinicaEmail || '')
        
        // Fazer logout imediatamente após criar o funcionário
        // Isso evita que o sistema redirecione para o dashboard do funcionário
        await signOut(auth)
        
        // Mostrar mensagem informando que precisa fazer login novamente
        toast.info('Funcionário cadastrado! Por favor, faça login novamente com suas credenciais da clínica.')
      }

      resetForm()
      await loadFuncionarios()
      toast.success(editingFuncionario ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao salvar funcionário:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está em uso')
      } else {
        toast.error(error.message || 'Erro ao salvar funcionário')
      }
    }
  }

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario)
    const telefoneSalvo = funcionario.telefone || ''
    setFormData({
      nome: funcionario.nome,
      email: funcionario.email,
      senha: '',
      telefone: telefoneSalvo ? formatPhoneBR(telefoneSalvo) : '',
      cargo: funcionario.cargo,
      especialidade: (funcionario as any).especialidade || '',
      crm: (funcionario as any).crm ? formatCRM((funcionario as any).crm) : '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    const funcionario = funcionarios.find(f => f.id === id)
    if (!funcionario) return

    const confirmed = await confirm(
      'Excluir Funcionário',
      `Tem certeza que deseja excluir o funcionário ${funcionario.nome}? Esta ação não pode ser desfeita.`,
      {
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    )

    if (!confirmed) return

    try {
      await deleteDoc(doc(db, 'funcionarios', id))
      await loadFuncionarios()
      toast.success('Funcionário excluído com sucesso!')
    } catch (error: any) {
      console.error('Erro ao excluir funcionário:', error)
      toast.error(error.message || 'Erro ao excluir funcionário')
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      telefone: '',
      cargo: 'recepcionista',
      especialidade: '',
      crm: '',
    })
    setEditingFuncionario(null)
    setShowModal(false)
  }

  const getCargoIcon = (cargo: string) => {
    switch (cargo) {
      case 'medico':
        return <Stethoscope size={20} />
      case 'recepcionista':
        return <UserCheck size={20} />
      default:
        return <UserX size={20} />
    }
  }

  const getCargoLabel = (cargo: string) => {
    switch (cargo) {
      case 'medico':
        return 'Médico'
      case 'recepcionista':
        return 'Recepcionista'
      default:
        return cargo
    }
  }

  if (loading) {
    return (
      <Layout currentProfile="clinica">
        <div className="loading-state">Carregando...</div>
      </Layout>
    )
  }

  return (
    <Layout currentProfile="clinica">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="funcionarios-container"
      >
        <div className="page-header">
          <h1>
            <Users size={28} />
            Gerenciamento de Funcionários
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="add-button"
          >
            <Plus size={20} />
            Novo Funcionário
          </motion.button>
        </div>

        {/* Lista de Funcionários */}
        <div className="funcionarios-grid">
          {funcionarios.map((funcionario, index) => (
            <motion.div
              key={funcionario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="funcionario-card"
            >
              <div className="funcionario-header">
                <div className="funcionario-avatar">
                  {funcionario.nome.charAt(0).toUpperCase()}
                </div>
                <div className="funcionario-info">
                  <h3>{funcionario.nome}</h3>
                  <div className="funcionario-cargo">
                    {getCargoIcon(funcionario.cargo)}
                    <span>{getCargoLabel(funcionario.cargo)}</span>
                  </div>
                </div>
              </div>
              <div className="funcionario-details">
                <p>
                  <strong>Email:</strong> {funcionario.email}
                </p>
                {funcionario.telefone && (
                  <p>
                    <strong>Telefone:</strong> {funcionario.telefone}
                  </p>
                )}
                {funcionario.cargo === 'medico' && (funcionario as any).especialidade && (
                  <p>
                    <strong>Especialidade:</strong> {(funcionario as any).especialidade}
                  </p>
                )}
                {funcionario.cargo === 'medico' && (funcionario as any).crm && (
                  <p>
                    <strong>CRM:</strong> {(funcionario as any).crm}
                  </p>
                )}
              </div>
              <div className="funcionario-actions">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEdit(funcionario)}
                  className="action-button edit"
                >
                  <Edit2 size={16} />
                  Editar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(funcionario.id)}
                  className="action-button delete"
                >
                  <Trash2 size={16} />
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          ))}
          {funcionarios.length === 0 && (
            <p className="empty-state">Nenhum funcionário cadastrado</p>
          )}
        </div>

        {/* Modal de Cadastro/Edição */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>{editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
                  <button onClick={() => {
                    resetForm()
                    setShowModal(false)
                  }} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={!!editingFuncionario}
                    />
                  </div>
                  {!editingFuncionario && (
                    <div className="form-group">
                      <label>Senha</label>
                      <input
                        type="password"
                        value={formData.senha}
                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                        required={!editingFuncionario}
                        minLength={6}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Telefone</label>
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
                  <div className="form-group">
                    <label>Cargo</label>
                    <select
                      value={formData.cargo}
                      onChange={(e) => {
                        const newCargo = e.target.value as 'recepcionista' | 'medico'
                        setFormData({ 
                          ...formData, 
                          cargo: newCargo,
                          // Limpar especialidade e CRM se mudar para recepcionista
                          especialidade: newCargo === 'recepcionista' ? '' : formData.especialidade,
                          crm: newCargo === 'recepcionista' ? '' : formData.crm
                        })
                      }}
                      required
                    >
                      <option value="recepcionista">Recepcionista</option>
                      <option value="medico">Médico</option>
                    </select>
                  </div>
                  {formData.cargo === 'medico' && (
                    <div className="form-group">
                      <label>Especialidade</label>
                      <input
                        type="text"
                        value={formData.especialidade}
                        onChange={(e) => {
                          const valor = e.target.value
                          // Aplica correção quando o usuário sai do campo (onBlur)
                          setFormData({ ...formData, especialidade: valor })
                        }}
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
                  )}
                  {formData.cargo === 'medico' && (
                    <div className="form-group">
                      <label>CRM</label>
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
                  )}
                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        resetForm()
                        setShowModal(false)
                      }}
                      className="cancel-button"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="save-button"
                    >
                      <Save size={16} />
                      Salvar
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {DialogComponent}
      <style>{`
        .funcionarios-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .add-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .funcionarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .funcionario-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .funcionario-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .funcionario-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .funcionario-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .funcionario-info h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .funcionario-cargo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-primary-medico);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .funcionario-details {
          margin-bottom: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .funcionario-details p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0.5rem 0;
        }

        .funcionario-details strong {
          color: var(--color-text);
        }

        .funcionario-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .action-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.edit {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .action-button.edit:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .action-button.delete {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .action-button.delete:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--color-text-muted);
          padding: 3rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 0.75rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--color-border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: var(--color-surface-elevated);
          color: var(--color-text);
        }

        .modal-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .form-group input,
        .form-group select {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .cancel-button {
          flex: 1;
          padding: 0.875rem;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button:hover {
          background: var(--color-surface);
        }

        .save-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
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

