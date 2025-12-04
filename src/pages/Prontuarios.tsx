import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase/config'
import { Prontuario } from '@/types'
import { FileText, Plus, Edit2, Search, Save, X, User, Calendar, Stethoscope, Trash2, Users, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { toast } from '@/components/Toast'
import { useConfirmDialog } from '@/utils/confirmDialog'

export default function Prontuarios() {
  const { userProfile } = useAuth()
  const { confirm, DialogComponent } = useConfirmDialog()
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProntuario, setEditingProntuario] = useState<Prontuario | null>(null)
  const [editingHistorico, setEditingHistorico] = useState<boolean>(false)
  const [viewingProntuario, setViewingProntuario] = useState<Prontuario | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [searchPaciente, setSearchPaciente] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [verTodosClinica, setVerTodosClinica] = useState(false) // Toggle para médicos verem todos os prontuários da clínica
  const [showCreatePacienteModal, setShowCreatePacienteModal] = useState(false)
  const [createPacienteLoading, setCreatePacienteLoading] = useState(false)
  const [newPaciente, setNewPaciente] = useState({
    nome: '',
    data_nascimento: '',
    telefone: '',
    cpf: '',
    endereco: '',
    plano: '',
  })
  const [formData, setFormData] = useState({
    idPaciente: '',
    nomePaciente: '',
    titulo: '',
    conteudo: '',
    anamnese: '',
    exame_fisico: '',
    sinais_vitais: '',
    diagnosticos: '',
    prescricoes: '',
    medicamentos: '',
    alergias: '',
    antecedentes: '',
    exames_solicitados: '',
    plano: '',
    follow_up: '',
    observacoes: '',
    historico: [] as Array<{ data: Date | string, profissional: string, observacao: string }>,
  })

  useEffect(() => {
    if (userProfile) {
      loadProntuarios()
      if (userProfile.perfil === 'recepcionista' || userProfile.perfil === 'medico') {
        loadPacientes()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, verTodosClinica]) // Recarrega quando entrar na página ou mudar o toggle

  const loadPacientes = async () => {
    if (!userProfile) return
    
    try {
      const pacientesRef = collection(db, 'pacientes')
      
      if (userProfile.perfil === 'recepcionista') {
        // Recepcionista: mostrar apenas pacientes que já tiveram consultas com a clínica
        const idClinica = (userProfile as any).idClinica
        if (idClinica) {
          const consultasRef = collection(db, 'consultas_clinicas')
          const consultasQuery = query(
            consultasRef,
            where('id_clinica', '==', idClinica)
          )
          const consultasSnap = await getDocs(consultasQuery)
          const pacientesIdsVinculados = new Set<string>()
          consultasSnap.docs.forEach(doc => {
            const data = doc.data()
            if (data.id_paciente) {
              pacientesIdsVinculados.add(data.id_paciente)
            }
          })
          
          // Buscar apenas os pacientes que têm consultas
          if (pacientesIdsVinculados.size > 0) {
            const pacientesData: any[] = []
            for (const pacienteId of pacientesIdsVinculados) {
              const pacienteDoc = await getDoc(doc(db, 'pacientes', pacienteId))
              if (pacienteDoc.exists()) {
                pacientesData.push({
                  id: pacienteDoc.id,
                  ...pacienteDoc.data(),
                })
              }
            }
            setPacientes(pacientesData)
          } else {
            setPacientes([])
          }
        } else {
          setPacientes([])
        }
      } else if (userProfile.perfil === 'medico') {
        // Médico de clínica: mostrar apenas pacientes que já tiveram consultas com ele
        const consultasRef = collection(db, 'consultas_clinicas')
        const consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', userProfile.id)
        )
        const consultasSnap = await getDocs(consultasQuery)
        const pacientesIdsVinculados = new Set<string>()
        consultasSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.id_paciente) {
            pacientesIdsVinculados.add(data.id_paciente)
          }
        })
        
        // Buscar apenas os pacientes que têm consultas com este médico
        if (pacientesIdsVinculados.size > 0) {
          const pacientesData: any[] = []
          for (const pacienteId of pacientesIdsVinculados) {
            const pacienteDoc = await getDoc(doc(db, 'pacientes', pacienteId))
            if (pacienteDoc.exists()) {
              pacientesData.push({
                id: pacienteDoc.id,
                ...pacienteDoc.data(),
              })
            }
          }
          setPacientes(pacientesData)
        } else {
          setPacientes([])
        }
      } else if (userProfile.perfil === 'profissional') {
        // Profissional autônomo: buscar pacientes que têm consultas com ele ou sem idClinica
        const consultasRef = collection(db, 'consultas_autonomos')
        const consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', userProfile.id)
        )
        const consultasSnap = await getDocs(consultasQuery)
        const pacientesIdsVinculados = new Set<string>()
        consultasSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.id_paciente) {
            pacientesIdsVinculados.add(data.id_paciente)
          }
        })
        
        // Buscar todos os pacientes
        const pacientesSnap = await getDocs(pacientesRef)
        const todosPacientes = pacientesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as any[]
        
        // Filtrar: mostrar apenas pacientes vinculados (com consultas) ou sem idClinica
        const pacientesData = todosPacientes.filter((p: any) => {
          if (pacientesIdsVinculados.has(p.id)) {
            return true
          }
          if (!p.idClinica || p.idClinica === null) {
            return true
          }
          return false
        })
        setPacientes(pacientesData)
      } else {
        // Outros perfis: não carregar pacientes
        setPacientes([])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const pacientesFiltrados = pacientes.filter(p => 
    p.nome?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchPaciente.toLowerCase())
  )

  const loadProntuarios = async () => {
    if (!userProfile) return

    setLoading(true)
    try {
      const prontuariosRef = collection(db, 'prontuarios')
      let prontuariosQuery

      // Filtrar prontuários baseado no perfil
      if (userProfile.perfil === 'recepcionista') {
        // Recepcionista vê prontuários da clínica
        const idClinica = (userProfile as any).idClinica
        if (idClinica) {
          prontuariosQuery = query(
            prontuariosRef,
            where('idClinica', '==', idClinica)
          )
        } else {
          // Se não tiver idClinica, busca todos (fallback)
          prontuariosQuery = prontuariosRef
        }
      } else if (userProfile.perfil === 'profissional') {
        // Profissional vê seus próprios prontuários
        prontuariosQuery = query(
          prontuariosRef,
          where('idProfissional', '==', userProfile.id)
        )
      } else if (userProfile.perfil === 'medico') {
        // Médico pode ver seus próprios prontuários ou todos da clínica (baseado no toggle)
        if (verTodosClinica) {
          // Ver todos os prontuários da clínica
          const idClinica = (userProfile as any).idClinica
          if (idClinica) {
            prontuariosQuery = query(
              prontuariosRef,
              where('idClinica', '==', idClinica)
            )
          } else {
            // Se não tiver idClinica, busca todos (fallback)
            prontuariosQuery = prontuariosRef
          }
        } else {
          // Ver apenas seus próprios prontuários
          prontuariosQuery = query(
            prontuariosRef,
            where('idProfissional', '==', userProfile.id)
          )
        }
      } else {
        prontuariosQuery = prontuariosRef
      }

      const prontuariosSnap = await getDocs(prontuariosQuery)
      let prontuariosData = prontuariosSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          dataRegistro: data.dataRegistro?.toDate ? data.dataRegistro.toDate() : (data.dataRegistro instanceof Date ? data.dataRegistro : new Date()),
          dataAtualizacao: data.dataAtualizacao?.toDate ? data.dataAtualizacao.toDate() : (data.dataAtualizacao instanceof Date ? data.dataAtualizacao : new Date()),
          historico: (data.historico || []).map((h: any) => ({
            ...h,
            data: h.data?.toDate ? h.data.toDate() : (h.data instanceof Date ? h.data : (h.data?.seconds ? new Date(h.data.seconds * 1000) : new Date())),
          })),
        }
      }) as Prontuario[]
      
      // Filtro adicional de segurança para médicos: só aplicar se não estiver vendo todos da clínica
      if (userProfile.perfil === 'medico' && !verTodosClinica) {
        console.log('🔍 Filtrando prontuários para médico (apenas meus):', {
          medicoId: userProfile.id,
          medicoNome: userProfile.nome,
          totalAntes: prontuariosData.length
        })
        
        prontuariosData = prontuariosData.filter(p => {
          const pertence = p.idProfissional === userProfile.id
          if (!pertence) {
            console.warn('🚫 Prontuário filtrado (não pertence ao médico):', {
              prontuarioId: p.id,
              paciente: p.nomePaciente,
              idProfissional: p.idProfissional,
              nomeProfissional: p.nomeProfissional,
              medicoLogado: userProfile.id
            })
          }
          return pertence
        })
        
        console.log('✅ Prontuários após filtro (apenas meus):', prontuariosData.length)
      } else if (userProfile.perfil === 'medico' && verTodosClinica) {
        console.log('🔍 Mostrando todos os prontuários da clínica:', {
          medicoId: userProfile.id,
          medicoNome: userProfile.nome,
          total: prontuariosData.length
        })
      }
      
      // Ordenar por data de atualização (mais recente primeiro)
      prontuariosData.sort((a, b) => 
        new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime()
      )
      
      setProntuarios(prontuariosData)
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error)
      toast.error('Erro ao carregar prontuários')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    if (!formData.idPaciente) {
      toast.error('Selecione um paciente')
      return
    }

    try {
      setLoading(true)
      
      if (editingProntuario) {
        // Atualizar prontuário existente
        const historico = editingProntuario.historico || []
        const novaObservacao = formData.observacoes.trim()
        
        // SEMPRE adicionar nova observação ao histórico se não estiver vazia
        // O campo de observações é sempre tratado como uma NOVA observação
        if (novaObservacao.trim()) {
          historico.push({
            data: new Date(),
            profissional: userProfile.nome,
            observacao: novaObservacao.trim(),
          })
        }

        // Se estiver editando histórico, usar o histórico do formData
        const historicoParaSalvar = editingHistorico 
          ? formData.historico.map(h => ({
              ...h,
              data: h.data instanceof Date ? Timestamp.fromDate(h.data) : (h.data && typeof h.data === 'object' && 'seconds' in h.data ? (h.data as any) : Timestamp.fromDate(new Date(h.data as any))),
            }))
          : historico.map(h => ({
              ...h,
              data: h.data instanceof Date ? Timestamp.fromDate(h.data) : (h.data && typeof h.data === 'object' && 'toDate' in h.data ? h.data : Timestamp.fromDate(new Date(h.data as any))),
            }))

        await updateDoc(doc(db, 'prontuarios', editingProntuario.id), {
          titulo: formData.titulo || null,
          conteudo: formData.conteudo || null,
          anamnese: formData.anamnese || null,
          exame_fisico: formData.exame_fisico || null,
          sinais_vitais: formData.sinais_vitais || null,
          diagnosticos: formData.diagnosticos || null,
          prescricoes: formData.prescricoes || null,
          medicamentos: formData.medicamentos || null,
          alergias: formData.alergias || null,
          antecedentes: formData.antecedentes || null,
          exames_solicitados: formData.exames_solicitados || null,
          plano: formData.plano || null,
          follow_up: formData.follow_up || null,
          observacoes: novaObservacao,
          historico: historicoParaSalvar,
          dataAtualizacao: Timestamp.now(),
        })
        toast.success('Prontuário atualizado com sucesso!')
      } else {
        // Criar novo prontuário
        // Primeiro, buscar dados do paciente
        const pacienteDoc = await getDoc(doc(db, 'pacientes', formData.idPaciente))
        if (!pacienteDoc.exists()) {
          toast.error('Paciente não encontrado')
          setLoading(false)
          return
        }
        const pacienteData = pacienteDoc.data()

        // Permitir múltiplos prontuários para o mesmo paciente
        // Cada prontuário pode ser um registro separado de consulta/atendimento
        
        const prontuario = {
          idPaciente: formData.idPaciente,
          nomePaciente: pacienteData.nome,
          titulo: formData.titulo || null,
          conteudo: formData.conteudo || null,
          anamnese: formData.anamnese || null,
          exame_fisico: formData.exame_fisico || null,
          sinais_vitais: formData.sinais_vitais || null,
          diagnosticos: formData.diagnosticos || null,
          prescricoes: formData.prescricoes || null,
          medicamentos: formData.medicamentos || null,
          alergias: formData.alergias || null,
          antecedentes: formData.antecedentes || null,
          exames_solicitados: formData.exames_solicitados || null,
          plano: formData.plano || null,
          follow_up: formData.follow_up || null,
          dataNascimento: pacienteData.dataNascimento ? (pacienteData.dataNascimento.toDate ? Timestamp.fromDate(pacienteData.dataNascimento.toDate()) : pacienteData.dataNascimento) : null,
          telefone: pacienteData.telefone || '',
          cpf: pacienteData.cpf || '',
          idProfissional: (userProfile.perfil === 'recepcionista') ? null : userProfile.id,
          nomeProfissional: (userProfile.perfil === 'recepcionista') ? null : userProfile.nome,
          // Profissionais autônomos NUNCA têm idClinica, recepcionistas sempre têm
          idClinica: (userProfile.perfil === 'recepcionista') 
            ? (userProfile as any).idClinica 
            : (userProfile.perfil === 'profissional' ? null : ((userProfile as any).idClinica || null)),
          observacoes: formData.observacoes.trim(),
          historico: [
            {
              data: Timestamp.now(),
              profissional: userProfile.nome,
              observacao: formData.observacoes.trim(),
            },
          ],
          dataRegistro: Timestamp.now(),
          dataAtualizacao: Timestamp.now(),
        }

        await addDoc(collection(db, 'prontuarios'), prontuario)
        toast.success('Prontuário criado com sucesso!')
      }

      // Aguardar um pouco para garantir que o Firestore atualizou
      await new Promise(resolve => setTimeout(resolve, 300))
      await loadProntuarios()
      resetForm()
    } catch (error: any) {
      console.error('Erro ao salvar prontuário:', error)
      toast.error(error.message || 'Erro ao salvar prontuário')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (prontuario: Prontuario) => {
    // Se for recepcionista, mostrar aviso antes de editar
    if (userProfile?.perfil === 'recepcionista') {
      const confirmed = await confirm(
        '⚠️ Aviso Importante',
        'Você está prestes a editar um prontuário. Certifique-se de consultar o médico responsável antes de fazer alterações significativas, especialmente nas observações médicas anteriores.',
        {
          confirmText: 'Entendi, continuar',
          cancelText: 'Cancelar',
          variant: 'warning'
        }
      )
      if (!confirmed) return
    }

    setEditingProntuario(prontuario)
    setFormData({
      idPaciente: prontuario.idPaciente,
      nomePaciente: prontuario.nomePaciente,
      titulo: (prontuario as any).titulo || '',
      conteudo: (prontuario as any).conteudo || '',
      anamnese: (prontuario as any).anamnese || '',
      exame_fisico: (prontuario as any).exame_fisico || '',
      sinais_vitais: (prontuario as any).sinais_vitais || '',
      diagnosticos: (prontuario as any).diagnosticos || '',
      prescricoes: (prontuario as any).prescricoes || '',
      medicamentos: (prontuario as any).medicamentos || '',
      alergias: (prontuario as any).alergias || '',
      antecedentes: (prontuario as any).antecedentes || '',
      exames_solicitados: (prontuario as any).exames_solicitados || '',
      plano: (prontuario as any).plano || '',
      follow_up: (prontuario as any).follow_up || '',
      // Deixar observações vazio para permitir adicionar nova observação
      // A observação atual já está visível no histórico
      observacoes: '',
      historico: (prontuario.historico || []).map(h => {
        let data: Date
        if (h.data instanceof Date) {
          data = h.data
        } else if (typeof h.data === 'string') {
          data = new Date(h.data)
        } else if (h.data && typeof h.data === 'object' && 'seconds' in h.data) {
          data = new Date((h.data as any).seconds * 1000)
        } else {
          data = new Date()
        }
        return {
          data,
          profissional: h.profissional,
          observacao: h.observacao,
        }
      }),
    })
    setEditingHistorico(false) // Não abrir o editor de histórico automaticamente
    setShowModal(true)
  }

  const handleDelete = async (prontuario: Prontuario) => {
    const confirmed = await confirm(
      'Deletar Prontuário',
      `Tem certeza que deseja deletar o prontuário de ${prontuario.nomePaciente}? Esta ação não pode ser desfeita.`,
      {
        confirmText: 'Deletar',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    )

    if (!confirmed) return

    try {
      setLoading(true)
      await deleteDoc(doc(db, 'prontuarios', prontuario.id))
      toast.success('Prontuário deletado com sucesso!')
      await loadProntuarios()
    } catch (error: any) {
      console.error('Erro ao deletar prontuário:', error)
      toast.error(error.message || 'Erro ao deletar prontuário')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateHistoricoItem = (index: number, field: 'observacao' | 'profissional', value: string) => {
    const newHistorico = [...formData.historico]
    newHistorico[index] = {
      ...newHistorico[index],
      [field]: value,
    }
    setFormData({ ...formData, historico: newHistorico })
  }

  const handleRemoveHistoricoItem = (index: number) => {
    const newHistorico = formData.historico.filter((_, i) => i !== index)
    setFormData({ ...formData, historico: newHistorico })
  }

  const handleAddHistoricoItem = () => {
    setFormData({
      ...formData,
      historico: [
        ...formData.historico,
        {
          data: new Date(),
          profissional: userProfile?.nome || '',
          observacao: '',
        },
      ],
    })
  }

  const resetForm = () => {
    setFormData({
      idPaciente: '',
      nomePaciente: '',
      titulo: '',
      conteudo: '',
      anamnese: '',
      exame_fisico: '',
      sinais_vitais: '',
      diagnosticos: '',
      prescricoes: '',
      medicamentos: '',
      alergias: '',
      antecedentes: '',
      exames_solicitados: '',
      plano: '',
      follow_up: '',
      observacoes: '',
      historico: [],
    })
    setSearchPaciente('')
    setShowPacientesList(false)
    setEditingProntuario(null)
    setEditingHistorico(false)
    setShowModal(false)
  }

  const prontuariosFiltrados = prontuarios.filter(p => 
    p.nomePaciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.idPaciente.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!userProfile) {
    return (
      <Layout currentProfile="clinica">
        <div className="loading-state">Carregando perfil...</div>
      </Layout>
    )
  }

  const canCreate = userProfile.perfil === 'recepcionista' || userProfile.perfil === 'medico' || userProfile.perfil === 'profissional'

  return (
    <Layout currentProfile={userProfile.perfil}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="prontuarios-container"
      >
        <div className="page-header">
          <h1>
            <FileText size={28} />
            Prontuários
          </h1>
          <div className="header-actions">
            {/* Toggle para médicos verem todos os prontuários da clínica */}
            {userProfile.perfil === 'medico' && (
              <div className="toggle-switch-container">
                <motion.div
                  className="toggle-switch"
                  onClick={() => setVerTodosClinica(!verTodosClinica)}
                  animate={{
                    backgroundColor: verTodosClinica 
                      ? 'rgba(139, 92, 246, 0.2)' 
                      : 'rgba(139, 92, 246, 0.1)'
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <motion.div
                    className="toggle-slider"
                    animate={{
                      x: verTodosClinica ? '100%' : '0%',
                      backgroundColor: verTodosClinica 
                        ? 'var(--color-primary-medico)' 
                        : 'var(--color-primary-medico-dark)'
                    }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 300, 
                      damping: 30 
                    }}
                  />
                  <div className="toggle-options">
                    <motion.div
                      className={`toggle-option ${!verTodosClinica ? 'active' : ''}`}
                      animate={{
                        color: !verTodosClinica ? 'white' : 'var(--color-text-muted)',
                        fontWeight: !verTodosClinica ? 600 : 500
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <UserCheck size={16} />
                      <span>Meus</span>
                    </motion.div>
                    <motion.div
                      className={`toggle-option ${verTodosClinica ? 'active' : ''}`}
                      animate={{
                        color: verTodosClinica ? 'white' : 'var(--color-text-muted)',
                        fontWeight: verTodosClinica ? 600 : 500
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Users size={16} />
                      <span>Todos</span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}
            {canCreate && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="new-button"
              >
                <Plus size={20} />
                Novo Prontuário
              </motion.button>
            )}
          </div>
        </div>

        {/* Busca */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="search-container"
            >
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder={userProfile.perfil === 'medico' 
                  ? "Buscar prontuário por nome do paciente..." 
                  : "Buscar prontuário por paciente..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </motion.div>

        {/* Lista de Prontuários */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="loading-state"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '2rem' }}
            >
              ⏳
            </motion.div>
            <p>Carregando prontuários...</p>
          </motion.div>
        ) : (
          <div className="prontuarios-grid">
            <AnimatePresence mode="popLayout">
              {prontuariosFiltrados.map((prontuario, index) => (
                <motion.div
                  key={prontuario.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(139, 92, 246, 0.2)" }}
                  className="prontuario-card"
                  onClick={() => {
                    setViewingProntuario(prontuario)
                    setShowViewModal(true)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="prontuario-header">
                    <div className="prontuario-avatar">
                      <Stethoscope size={24} />
                    </div>
                    <div className="prontuario-info">
                      <h3>{prontuario.nomePaciente}</h3>
                      <p className="prontuario-date">
                        <Calendar size={14} />
                        {format(new Date(prontuario.dataRegistro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {/* Mostrar médico responsável quando estiver vendo todos da clínica */}
                      {verTodosClinica && userProfile.perfil === 'medico' && (prontuario as any).nomeProfissional && (
                        <p className="prontuario-medico">
                          <Stethoscope size={14} />
                          Médico: {(prontuario as any).nomeProfissional}
                          {(prontuario as any).idProfissional === userProfile.id && (
                            <span className="meu-prontuario-badge"> (Meu)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="prontuario-body">
                    <div className="prontuario-details">
                      {prontuario.telefone && (
                        <p>
                          <strong>Telefone:</strong> {prontuario.telefone}
                        </p>
                      )}
                      {prontuario.cpf && (
                        <p>
                          <strong>CPF:</strong> {prontuario.cpf}
                        </p>
                      )}
                    </div>

                    <div className="prontuario-observacoes">
                      <h4>Observações</h4>
                      <p>{prontuario.observacoes || 'Nenhuma observação registrada'}</p>
                    </div>

                    {prontuario.historico && prontuario.historico.length > 0 && (
                      <div className="prontuario-historico">
                        <h4>Histórico ({prontuario.historico.length} registros)</h4>
                        <div className="historico-list">
                          {prontuario.historico.slice(-3).map((item, idx) => (
                            <div key={idx} className="historico-item">
                              <p className="historico-text">{item.observacao}</p>
                              <p className="historico-meta">
                                {item.profissional} • {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="prontuario-actions" onClick={(e) => e.stopPropagation()}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEdit(prontuario)}
                      className="action-button edit"
                    >
                      <Edit2 size={16} />
                      {userProfile.perfil === 'recepcionista' ? 'Editar Completo' : 'Adicionar Observação'}
                    </motion.button>
                    {userProfile.perfil === 'recepcionista' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(prontuario)}
                        className="action-button delete"
                      >
                        <Trash2 size={16} />
                        Deletar
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {prontuariosFiltrados.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="empty-state"
              >
                <FileText size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>Nenhum prontuário encontrado</p>
                {canCreate && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      resetForm()
                      setShowModal(true)
                    }}
                    className="empty-state-button"
                  >
                    <Plus size={20} />
                    Criar Primeiro Prontuário
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Modal de Edição/Criação */}
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
                className="modal-content large"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    <FileText size={24} />
                    {editingProntuario ? 'Editar Prontuário' : 'Novo Prontuário'}
                  </h2>
                  <button onClick={() => resetForm()} className="close-button">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="prontuario-form">
                  {!editingProntuario && canCreate && (
                    <div className="form-group">
                      <label>
                        <User size={18} />
                        Paciente
                      </label>
                      <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                          type="text"
                          placeholder="Clique para ver pacientes ou busque por nome/email..."
                          value={formData.idPaciente && !showPacientesList 
                            ? pacientes.find(p => p.id === formData.idPaciente)?.nome || ''
                            : searchPaciente}
                          onChange={(e) => {
                            setSearchPaciente(e.target.value)
                            setShowPacientesList(true)
                            if (!e.target.value) {
                              setFormData({ ...formData, idPaciente: '', nomePaciente: '' })
                            }
                          }}
                          onFocus={() => {
                            setShowPacientesList(true)
                            setSearchPaciente('')
                          }}
                          readOnly={!!formData.idPaciente && !showPacientesList}
                          required={!formData.idPaciente}
                          className="search-input"
                        />
                        {formData.idPaciente && !showPacientesList && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, idPaciente: '', nomePaciente: '' })
                              setSearchPaciente('')
                              setShowPacientesList(true)
                            }}
                            className="edit-selection"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCreatePacienteModal(true)}
                        style={{ marginTop: '0.5rem' }}
                        className="action-button"
                      >
                        <Plus size={14} />
                        Novo paciente
                      </button>
                      {showPacientesList && (
                        <div className="select-list">
                          {pacientesFiltrados.length > 0 ? (
                            pacientesFiltrados.map(paciente => (
                              <motion.button
                                key={paciente.id}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setFormData({ 
                                    ...formData, 
                                    idPaciente: paciente.id,
                                    nomePaciente: paciente.nome || ''
                                  })
                                  setSearchPaciente('')
                                  setShowPacientesList(false)
                                }}
                                className={`select-item ${formData.idPaciente === paciente.id ? 'selected' : ''}`}
                              >
                                <div>
                                  <p className="name">{paciente.nome}</p>
                                  <p className="email">{paciente.email}</p>
                                  {paciente.telefone && (
                                    <p className="telefone">{paciente.telefone}</p>
                                  )}
                                </div>
                              </motion.button>
                            ))
                          ) : (
                            <div className="empty-state">
                              <p>Nenhum paciente encontrado</p>
                              <span>Tente buscar por nome ou email</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {editingProntuario && (
                    <div className="form-group">
                      <label>
                        <User size={18} />
                        Paciente
                      </label>
                      <input
                        type="text"
                        value={formData.nomePaciente}
                        disabled
                        className="disabled"
                      />
                    </div>
                  )}

                  {/* Campos do prontuário (baseado no template Django) */}
                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      Título
                    </label>
                    <input
                      type="text"
                      value={(formData as any).titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Título do prontuário / resumo"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      Conteúdo
                    </label>
                    <textarea
                      value={(formData as any).conteudo}
                      onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                      rows={4}
                      placeholder="Descrição detalhada / conteúdo do atendimento"
                    />
                  </div>

                  <div className="form-group">
                    <label>Anamnese</label>
                    <textarea
                      value={(formData as any).anamnese}
                      onChange={(e) => setFormData({ ...formData, anamnese: e.target.value })}
                      rows={3}
                      placeholder="Anamnese"
                    />
                  </div>

                  <div className="form-group">
                    <label>Exame Físico</label>
                    <textarea
                      value={(formData as any).exame_fisico}
                      onChange={(e) => setFormData({ ...formData, exame_fisico: e.target.value })}
                      rows={3}
                      placeholder="Exame físico"
                    />
                  </div>

                  <div className="form-group">
                    <label>Sinais Vitais</label>
                    <input
                      type="text"
                      value={(formData as any).sinais_vitais}
                      onChange={(e) => setFormData({ ...formData, sinais_vitais: e.target.value })}
                      placeholder="PA, FC, FR, temperatura, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label>Diagnósticos</label>
                    <textarea
                      value={(formData as any).diagnosticos}
                      onChange={(e) => setFormData({ ...formData, diagnosticos: e.target.value })}
                      rows={2}
                      placeholder="Diagnósticos"
                    />
                  </div>

                  <div className="form-group">
                    <label>Prescrições</label>
                    <textarea
                      value={(formData as any).prescricoes}
                      onChange={(e) => setFormData({ ...formData, prescricoes: e.target.value })}
                      rows={2}
                      placeholder="Prescrições / orientações medicamentosas"
                    />
                  </div>

                  <div className="form-group">
                    <label>Medicamentos</label>
                    <input
                      type="text"
                      value={(formData as any).medicamentos}
                      onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                      placeholder="Medicamentos (nome, dose)"
                    />
                  </div>

                  <div className="form-group">
                    <label>Alergias</label>
                    <input
                      type="text"
                      value={(formData as any).alergias}
                      onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                      placeholder="Alergias"
                    />
                  </div>

                  <div className="form-group">
                    <label>Antecedentes</label>
                    <textarea
                      value={(formData as any).antecedentes}
                      onChange={(e) => setFormData({ ...formData, antecedentes: e.target.value })}
                      rows={2}
                      placeholder="Antecedentes"
                    />
                  </div>

                  <div className="form-group">
                    <label>Exames Solicitados</label>
                    <textarea
                      value={(formData as any).exames_solicitados}
                      onChange={(e) => setFormData({ ...formData, exames_solicitados: e.target.value })}
                      rows={2}
                      placeholder="Exames solicitados"
                    />
                  </div>

                  <div className="form-group">
                    <label>Plano / Orientações</label>
                    <textarea
                      value={(formData as any).plano}
                      onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                      rows={2}
                      placeholder="Plano / orientações ao paciente"
                    />
                  </div>

                  <div className="form-group">
                    <label>Follow-up / Retorno</label>
                    <input
                      type="text"
                      value={(formData as any).follow_up}
                      onChange={(e) => setFormData({ ...formData, follow_up: e.target.value })}
                      placeholder="Data ou instruções de follow-up"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      {editingProntuario ? 'Nova Observação' : 'Observações'}
                      {editingProntuario && <span className="label-hint">(será adicionada ao histórico ao salvar)</span>}
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={6}
                      placeholder={editingProntuario 
                        ? "Digite uma nova observação para adicionar ao histórico..." 
                        : "Digite as observações do prontuário..."}
                      required={!editingProntuario}
                    />
                    {editingProntuario && editingProntuario.observacoes && (
                      <div className="current-observations-hint">
                        <p><strong>Observação atual:</strong> {editingProntuario.observacoes}</p>
                        <p className="hint-text">Digite acima para adicionar uma nova observação ao histórico</p>
                      </div>
                    )}
                  </div>

                  {editingHistorico && editingProntuario && (
                    <div className="form-group historico-editor">
                      <div className="historico-header">
                        <label>
                          <Calendar size={18} />
                          Histórico de Observações
                        </label>
                        {userProfile?.perfil === 'recepcionista' && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAddHistoricoItem}
                            className="add-historico-button"
                          >
                            <Plus size={16} />
                            Adicionar Registro
                          </motion.button>
                        )}
                      </div>
                      {formData.historico.length === 0 ? (
                        <div className="historico-empty">
                          <p>Nenhum registro no histórico</p>
                        </div>
                      ) : (
                        <div className="historico-editor-list">
                          {formData.historico.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="historico-editor-item"
                            >
                              <div className="historico-editor-header">
                                <div className="historico-editor-date">
                                  <Calendar size={14} />
                                  {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                                {userProfile?.perfil === 'recepcionista' && (
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleRemoveHistoricoItem(index)}
                                    className="remove-historico-button"
                                  >
                                    <X size={14} />
                                  </motion.button>
                                )}
                              </div>
                              <div className="historico-editor-content">
                                <div className="form-group-small">
                                  <label>Profissional</label>
                                  <input
                                    type="text"
                                    value={item.profissional}
                                    onChange={(e) => handleUpdateHistoricoItem(index, 'profissional', e.target.value)}
                                    placeholder="Nome do profissional"
                                    disabled={userProfile?.perfil !== 'recepcionista'}
                                  />
                                </div>
                                <div className="form-group-small">
                                  <label>Observação</label>
                                  <textarea
                                    value={item.observacao}
                                    onChange={(e) => handleUpdateHistoricoItem(index, 'observacao', e.target.value)}
                                    placeholder="Observação do registro..."
                                    rows={3}
                                    disabled={userProfile?.perfil !== 'recepcionista'}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => resetForm()}
                      className="cancel-button"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={loading || !formData.idPaciente}
                      whileHover={!loading && formData.idPaciente ? { scale: 1.05 } : {}}
                      whileTap={!loading && formData.idPaciente ? { scale: 0.95 } : {}}
                      className="save-button"
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{ display: 'inline-block' }}
                        >
                          <Save size={18} />
                        </motion.div>
                      ) : (
                        <Save size={18} />
                      )}
                      {loading ? 'Salvando...' : editingProntuario ? 'Atualizar' : 'Criar'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Criar Paciente */}
        <AnimatePresence>
          {showCreatePacienteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              style={{ zIndex: 2000 }}
              onClick={() => setShowCreatePacienteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-content"
                style={{ zIndex: 2001 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    <Plus size={24} />
                    Novo Paciente
                  </h2>
                  <button onClick={() => setShowCreatePacienteModal(false)} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nome Completo *</label>
                    <input 
                      type="text" 
                      value={newPaciente.nome} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, nome: e.target.value })}
                      placeholder="Nome completo do paciente"
                      required
                    />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Data de Nascimento</label>
                      <input 
                        type="date" 
                        value={newPaciente.data_nascimento} 
                        onChange={(e) => setNewPaciente({ ...newPaciente, data_nascimento: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label>CPF</label>
                      <input 
                        type="text" 
                        value={newPaciente.cpf} 
                        onChange={(e) => setNewPaciente({ ...newPaciente, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input 
                      type="text" 
                      value={newPaciente.telefone} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Endereço</label>
                    <input 
                      type="text" 
                      value={newPaciente.endereco} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, endereco: e.target.value })}
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>
                  <div className="form-group">
                    <label>Plano de Saúde</label>
                    <input 
                      type="text" 
                      value={newPaciente.plano} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, plano: e.target.value })}
                      placeholder="Ex: Unimed, Bradesco Saúde, etc."
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => { 
                      setShowCreatePacienteModal(false)
                      setNewPaciente({ nome: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' })
                    }} 
                    className="cancel-button"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    className="save-button" 
                    disabled={createPacienteLoading} 
                    onClick={async () => {
                      const nome = newPaciente.nome?.trim()
                      
                      if (!nome) { 
                        toast.error('Nome é obrigatório')
                        return 
                      }
                      
                      try {
                        setCreatePacienteLoading(true)
                        
                        // Criar paciente apenas no Firestore (sem Auth)
                        const pacientesRef = collection(db, 'pacientes')
                        const payload: any = {
                          nome,
                          data_nascimento: newPaciente.data_nascimento || '',
                          telefone: newPaciente.telefone || '',
                          cpf: newPaciente.cpf || '',
                          endereco: newPaciente.endereco || '',
                          plano: newPaciente.plano || '',
                          perfil: 'paciente',
                          idClinica: userProfile?.perfil === 'clinica' ? userProfile.id : null,
                          created_at: Timestamp.now(),
                          dataCriacao: Timestamp.now(),
                        }
                        
                        const docRef = await addDoc(pacientesRef, payload)
                        const pacienteId = docRef.id
                        
                        const createdPaciente = {
                          id: pacienteId,
                          nome,
                          telefone: newPaciente.telefone || '',
                          data_nascimento: newPaciente.data_nascimento || '',
                          cpf: newPaciente.cpf || '',
                          endereco: newPaciente.endereco || '',
                          plano: newPaciente.plano || '',
                        }
                        
                        setPacientes(prev => [createdPaciente, ...prev])
                        setFormData({ ...formData, idPaciente: pacienteId, nomePaciente: nome })
                        setSearchPaciente('')
                        setShowPacientesList(false)
                        setShowCreatePacienteModal(false)
                        setNewPaciente({ nome: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' })
                        toast.success('Paciente criado e selecionado com sucesso!')
                      } catch (err: any) {
                        console.error('Erro ao criar paciente:', err)
                        toast.error(err.message || 'Erro ao criar paciente')
                      } finally { 
                        setCreatePacienteLoading(false) 
                      }
                    }}
                  >
                    {createPacienteLoading ? 'Criando...' : 'Criar paciente'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Visualização */}
        <AnimatePresence>
          {showViewModal && viewingProntuario && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => {
                setShowViewModal(false)
                setViewingProntuario(null)
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content large"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    <FileText size={24} />
                    Prontuário - {viewingProntuario.nomePaciente}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowViewModal(false)
                      setViewingProntuario(null)
                    }} 
                    className="close-button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  {/* Informações do Paciente */}
                  <div className="form-group">
                    <label>
                      <User size={18} />
                      Informações do Paciente
                    </label>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Nome</div>
                        <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{viewingProntuario.nomePaciente}</div>
                      </div>
                      {viewingProntuario.dataNascimento && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Data de Nascimento</div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{format(new Date(viewingProntuario.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}</div>
                        </div>
                      )}
                      {viewingProntuario.telefone && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Telefone</div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{viewingProntuario.telefone}</div>
                        </div>
                      )}
                      {viewingProntuario.cpf && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>CPF</div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{viewingProntuario.cpf}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Data de Registro</div>
                        <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{format(new Date(viewingProntuario.dataRegistro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                      </div>
                      {viewingProntuario.dataAtualizacao && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Última Atualização</div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{format(new Date(viewingProntuario.dataAtualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                        </div>
                      )}
                      {(viewingProntuario as any).nomeProfissional && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Profissional Responsável</div>
                          <div style={{ padding: '0.75rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)' }}>{(viewingProntuario as any).nomeProfissional}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos do Prontuário */}
                  {(viewingProntuario as any).titulo && (
                    <div className="form-group">
                      <label>Título</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).titulo}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).conteudo && (
                    <div className="form-group">
                      <label>Conteúdo</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).conteudo}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).anamnese && (
                    <div className="form-group">
                      <label>Anamnese</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).anamnese}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).exame_fisico && (
                    <div className="form-group">
                      <label>Exame Físico</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).exame_fisico}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).sinais_vitais && (
                    <div className="form-group">
                      <label>Sinais Vitais</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).sinais_vitais}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).diagnosticos && (
                    <div className="form-group">
                      <label>Diagnósticos</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).diagnosticos}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).prescricoes && (
                    <div className="form-group">
                      <label>Prescrições</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).prescricoes}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).medicamentos && (
                    <div className="form-group">
                      <label>Medicamentos</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).medicamentos}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).alergias && (
                    <div className="form-group">
                      <label>Alergias</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).alergias}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).antecedentes && (
                    <div className="form-group">
                      <label>Antecedentes</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).antecedentes}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).exames_solicitados && (
                    <div className="form-group">
                      <label>Exames Solicitados</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).exames_solicitados}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).plano && (
                    <div className="form-group">
                      <label>Plano / Orientações</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).plano}</div>
                    </div>
                  )}

                  {(viewingProntuario as any).follow_up && (
                    <div className="form-group">
                      <label>Follow-up / Retorno</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{(viewingProntuario as any).follow_up}</div>
                    </div>
                  )}

                  {viewingProntuario.observacoes && (
                    <div className="form-group">
                      <label>Observações</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{viewingProntuario.observacoes}</div>
                    </div>
                  )}

                  {/* Histórico */}
                  {viewingProntuario.historico && viewingProntuario.historico.length > 0 && (
                    <div className="form-group">
                      <label>Histórico ({viewingProntuario.historico.length} registros)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {viewingProntuario.historico.map((item, idx) => (
                          <div key={idx} style={{ padding: '1rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.profissional}</span>
                              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{item.observacao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowViewModal(false)
                      setViewingProntuario(null)
                    }}
                    className="cancel-button"
                  >
                    Fechar
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowViewModal(false)
                      setViewingProntuario(null)
                      handleEdit(viewingProntuario)
                    }}
                    className="save-button"
                  >
                    <Edit2 size={16} />
                    Editar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {DialogComponent && <>{DialogComponent}</>}
      </motion.div>

      <style>{`
        .prontuarios-container {
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

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .toggle-switch-container {
          display: flex;
          align-items: center;
        }

        .toggle-switch {
          position: relative;
          width: 200px;
          height: 44px;
          background: rgba(139, 92, 246, 0.1);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .toggle-switch:hover {
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .toggle-slider {
          position: absolute;
          left: 4px;
          top: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: var(--color-primary-medico-dark);
          border-radius: 8px;
          z-index: 1;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .toggle-options {
          position: relative;
          z-index: 2;
          display: flex;
          width: 100%;
          height: 100%;
        }

        .toggle-option {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          color: var(--color-text-muted);
        }

        .toggle-option.active {
          color: white;
          font-weight: 600;
        }

        .new-button {
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

        .new-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .search-container {
          position: relative;
          margin-bottom: 2rem;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .prontuarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .prontuario-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .prontuario-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }


        .prontuario-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .prontuario-avatar {
          width: 56px;
          height: 56px;
          border-radius: 0.75rem;
          background: rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary-medico);
        }

        .prontuario-info h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .prontuario-date {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .prontuario-medico {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0.5rem 0 0 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .meu-prontuario-badge {
          color: var(--color-primary-medico);
          font-weight: 600;
        }

        .prontuario-body {
          margin-bottom: 1.5rem;
        }

        .prontuario-details {
          margin-bottom: 1rem;
        }

        .prontuario-details p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0.5rem 0;
        }

        .prontuario-details strong {
          color: var(--color-text);
        }

        .prontuario-observacoes {
          margin-bottom: 1rem;
        }

        .prontuario-observacoes h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.5rem 0;
        }

        .prontuario-observacoes p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin: 0;
        }

        .prontuario-historico {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .prontuario-historico h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.75rem 0;
        }

        .historico-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .historico-item {
          padding: 0.75rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
        }

        .historico-text {
          font-size: 0.875rem;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
          line-height: 1.5;
        }

        .historico-meta {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .prontuario-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.primary {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .action-button.primary:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .action-button.edit {
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-primary-medico);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .action-button.edit:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .action-button.delete {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .action-button.delete:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .historico-editor {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--color-border);
        }

        .historico-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .historico-header label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .add-historico-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-primary-medico);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-historico-button:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .historico-empty {
          padding: 2rem;
          text-align: center;
          color: var(--color-text-muted);
          background: var(--color-surface-elevated);
          border-radius: 0.5rem;
        }

        .historico-editor-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 400px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .historico-editor-item {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .historico-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--color-border);
        }

        .historico-editor-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .remove-historico-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .remove-historico-button:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .historico-editor-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-group-small {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group-small label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .form-group-small input,
        .form-group-small textarea {
          padding: 0.625rem 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.875rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group-small input:focus,
        .form-group-small textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group-small input:disabled,
        .form-group-small textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-button.edit:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--color-text-muted);
          padding: 4rem 2rem;
        }

        .empty-state p {
          font-size: 1.125rem;
          margin: 0.5rem 0 1.5rem 0;
        }

        .empty-state-button {
          display: inline-flex;
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

        .empty-state-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: var(--color-text-muted);
          grid-column: 1 / -1;
        }

        .loading-state p {
          margin-top: 1rem;
          font-size: 1rem;
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
          padding: 2rem;
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 0.75rem;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--color-border);
        }

        .modal-content.large {
          max-width: 800px;
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
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .modal-body {
          padding: 1.5rem;
        }

        .prontuario-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group input.disabled,
        .form-group textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-wrapper .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .search-wrapper .search-input {
          padding-left: 3rem;
          width: 100%;
        }

        .search-wrapper input[readonly] {
          cursor: pointer;
          background: rgba(139, 92, 246, 0.05);
        }

        .edit-selection {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }

        .edit-selection:hover {
          background: rgba(139, 92, 246, 0.2);
          color: var(--color-primary-medico);
        }

        .select-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          margin-top: 0.25rem;
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
        }

        .select-item {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-item:hover {
          background: var(--color-surface-elevated);
          border-color: var(--color-primary-medico);
        }

        .select-item.selected {
          background: rgba(139, 92, 246, 0.1);
          border-color: var(--color-primary-medico);
        }

        .select-item .name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .select-item .email {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .select-item .telefone {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0.25rem 0 0 0;
        }

        .form-group .empty-state {
          padding: 1.5rem 1rem;
          text-align: center;
          position: static;
        }

        .form-group .empty-state p {
          font-size: 0.95rem;
          color: var(--color-text);
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .form-group .empty-state span {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid var(--color-border);
        }

        .cancel-button,
        .save-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cancel-button {
          background: var(--color-background);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }

        .cancel-button:hover {
          background: var(--color-surface-elevated);
        }

        .save-button {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .save-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .label-hint {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--color-text-muted);
          margin-left: 0.5rem;
        }

        .current-observations-hint {
          margin-top: 0.75rem;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-lg);
        }

        .current-observations-hint p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--color-text);
        }

        .current-observations-hint p strong {
          color: var(--color-primary-medico);
        }

        .current-observations-hint .hint-text {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          font-style: italic;
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
