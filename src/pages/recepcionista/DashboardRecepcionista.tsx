import HorariosDisponiveis from '@/components/HorariosDisponiveis'
import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { Consulta } from '@/types'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle, Edit2, Plus, Save, X, XCircle, Search, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isPastDateTime } from '@/utils/validators'

interface Paciente {
  id: string
  nome: string
  email: string
}

interface Profissional {
  id: string
  nome: string
  especialidade?: string
}

export default function DashboardRecepcionista() {
  const { userProfile } = useAuth()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [formData, setFormData] = useState({
    idPaciente: '',
    nomePaciente: '',
    idProfissional: '',
    nomeProfissional: '',
    dataConsulta: '',
    horaConsulta: '',
    status: 'agendada' as Consulta['status'],
    observacoes: '',
  })
  const [medicos, setMedicos] = useState<any[]>([])
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [searchPaciente, setSearchPaciente] = useState('')
  const [searchProfissional, setSearchProfissional] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [showProfissionaisList, setShowProfissionaisList] = useState(false)
  const [filtroProfissional, setFiltroProfissional] = useState<string>('')
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

  useEffect(() => {
    loadConsultas()
    loadMedicos()
    loadPacientesAndProfissionais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'Agendada'
      case 'confirmada':
        return 'Confirmada'
      case 'realizada':
        return 'Realizada'
      case 'cancelada':
        return 'Cancelada'
      case 'nao_compareceu':
        return 'Não compareceu'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
    }
  }

  useEffect(() => {
    if (!showPacientesList && !showProfissionaisList) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Não fechar se clicar no input, no search-wrapper ou na lista
      if (!target.closest('.search-wrapper') && !target.closest('.select-list') && !target.closest('.search-input')) {
        setShowPacientesList(false)
        setShowProfissionaisList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPacientesList, showProfissionaisList])

  const loadMedicos = async () => {
    if (!userProfile || userProfile.perfil !== 'recepcionista') return

    try {
      const idClinica = (userProfile as any).idClinica
      
      // Carregar funcionários médicos
      const funcionariosRef = collection(db, 'funcionarios')
      const funcionariosQuery = query(
        funcionariosRef,
        where('idClinica', '==', idClinica),
        where('cargo', '==', 'medico')
      )
      const funcionariosSnap = await getDocs(funcionariosQuery)
      const medicosData = funcionariosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      
      setMedicos(medicosData)
      if (medicosData.length > 0 && !selectedMedicoId) {
        setSelectedMedicoId(medicosData[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
    }
  }

  const loadPacientesAndProfissionais = async () => {
    if (!userProfile || userProfile.perfil !== 'recepcionista') return

    try {
      const idClinica = (userProfile as any).idClinica
      
      // Carregar apenas pacientes que já tiveram consultas com a clínica
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
          const pacientesData: Paciente[] = []
          for (const pacienteId of pacientesIdsVinculados) {
            const pacienteDoc = await getDoc(doc(db, 'pacientes', pacienteId))
            if (pacienteDoc.exists()) {
              pacientesData.push({
                id: pacienteDoc.id,
                ...pacienteDoc.data(),
              } as Paciente)
            }
          }
          setPacientes(pacientesData)
        } else {
          setPacientes([])
        }

        // Carregar profissionais da clínica
        const profissionaisRef = collection(db, 'profissionais')
        const profissionaisQuery = query(profissionaisRef, where('idClinica', '==', idClinica))
        const profissionaisSnap = await getDocs(profissionaisQuery)
        const profissionaisData = profissionaisSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Profissional[]

        // Carregar funcionários médicos
        const funcionariosRef = collection(db, 'funcionarios')
        const funcionariosQuery = query(
          funcionariosRef,
          where('idClinica', '==', idClinica)
        )
        const funcionariosSnap = await getDocs(funcionariosQuery)
        const funcionariosData = funcionariosSnap.docs
          .filter(doc => doc.data().cargo === 'medico')
          .map(doc => ({
            id: doc.id,
            nome: doc.data().nome,
            especialidade: doc.data().especialidade || '',
          })) as Profissional[]

        setProfissionais([...profissionaisData, ...funcionariosData])
      } else {
        setPacientes([])
        setProfissionais([])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes e profissionais:', error)
    }
  }

  const loadConsultas = async () => {
    if (!userProfile || userProfile.perfil !== 'recepcionista') return

    setLoading(true)
    try {
      // Recepcionista (clinica) -> carregar de consultas_clinicas
      const collectionName = 'consultas_clinicas'
      const consultasRef = collection(db, collectionName)
      const consultasQuery = query(
        consultasRef,
        where('id_clinica', '==', (userProfile as any).idClinica)
      )
      const consultasSnap = await getDocs(consultasQuery)
      let consultasData = consultasSnap.docs.map(doc => {
        const data = doc.data()
        const rawDataConsulta = data.data_consulta || data.dataConsulta
        const parsedDataConsulta = typeof rawDataConsulta === 'string' ? new Date(rawDataConsulta.replace(' ', 'T')) : (rawDataConsulta?.toDate?.() || new Date())
        const rawCreated = data.created_at || data.dataCriacao
        const parsedCreated = rawCreated?.toDate?.() || (typeof rawCreated === 'string' ? new Date(rawCreated) : new Date())
        return {
          id: doc.id,
          idPaciente: data.id_paciente || data.idPaciente || '',
          nomePaciente: data.nm_paciente || data.nomePaciente || '',
          idProfissional: data.id_profissional || data.idProfissional || '',
          nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
          dataConsulta: parsedDataConsulta,
          dataCriacao: parsedCreated,
          status: String(data.status || '').toLowerCase(),
          observacoes: data.obs || data.observacoes || '',
        } as Consulta
      }) as Consulta[]

      // Filtrar apenas consultas de hoje
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      consultasData = consultasData.filter(c => {
        const dataConsulta = new Date(c.dataConsulta)
        dataConsulta.setHours(0, 0, 0, 0)
        return dataConsulta.getTime() === hoje.getTime()
      })

      // Marcar automaticamente como realizada consultas passadas que ainda estão agendadas ou confirmadas
      const agora = new Date()
      const consultasParaAtualizar: { id: string }[] = []
      
      consultasData.forEach(c => {
        const dataConsulta = new Date(c.dataConsulta)
        const statusLower = String(c.status || '').toLowerCase()
        if (dataConsulta < agora && (statusLower === 'agendada' || statusLower === 'confirmada')) {
          consultasParaAtualizar.push({ id: c.id })
        }
      })

      // Atualizar consultas passadas
      if (consultasParaAtualizar.length > 0) {
        await Promise.all(consultasParaAtualizar.map(async ({ id }) => {
          try {
            await updateDoc(doc(db, collectionName, id), {
              status: 'Realizada',
            })
          } catch (error) {
            console.error(`Erro ao atualizar consulta ${id}:`, error)
          }
        }))
        // Recarregar consultas após atualização
        const consultasRef2 = collection(db, collectionName)
        const consultasQuery2 = query(
          consultasRef2,
          where('id_clinica', '==', (userProfile as any).idClinica)
        )
        const consultasSnap2 = await getDocs(consultasQuery2)
        consultasData = consultasSnap2.docs.map(doc => {
          const data = doc.data()
          const rawDataConsulta = data.data_consulta || data.dataConsulta
          const parsedDataConsulta = typeof rawDataConsulta === 'string' ? new Date(rawDataConsulta.replace(' ', 'T')) : (rawDataConsulta?.toDate?.() || new Date())
          const rawCreated = data.created_at || data.dataCriacao
          const parsedCreated = rawCreated?.toDate?.() || (typeof rawCreated === 'string' ? new Date(rawCreated) : new Date())
          return {
            id: doc.id,
            idPaciente: data.id_paciente || data.idPaciente || '',
            nomePaciente: data.nm_paciente || data.nomePaciente || '',
            idProfissional: data.id_profissional || data.idProfissional || '',
            nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
            dataConsulta: parsedDataConsulta,
            dataCriacao: parsedCreated,
            status: String(data.status || '').toLowerCase(),
            observacoes: data.obs || data.observacoes || '',
          } as Consulta
        }) as Consulta[]

        // Reaplicar filtro de hoje
        const hoje2 = new Date()
        hoje2.setHours(0, 0, 0, 0)
        consultasData = consultasData.filter(c => {
          const dataConsulta = new Date(c.dataConsulta)
          dataConsulta.setHours(0, 0, 0, 0)
          return dataConsulta.getTime() === hoje2.getTime()
        })
      }

      // Ordenar por hora
      consultasData.sort((a, b) => 
        new Date(a.dataConsulta).getTime() - new Date(b.dataConsulta).getTime()
      )

      setConsultas(consultasData)
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar consultas por profissional
  const consultasFiltradas = filtroProfissional
    ? consultas.filter(c => 
        c.idProfissional === filtroProfissional ||
        c.nomeProfissional?.toLowerCase().includes(filtroProfissional.toLowerCase())
      )
    : consultas

  const handleStatusChange = async (consultaId: string, novoStatus: Consulta['status']) => {
    try {
      // Recepcionista -> atualizar em consultas_clinicas
      const statusToSave = (novoStatus || '').charAt(0).toUpperCase() + (novoStatus || '').slice(1)
      await updateDoc(doc(db, 'consultas_clinicas', consultaId), {
        status: statusToSave,
      })
      await loadConsultas()
      toast.success(`Status da consulta alterado para ${novoStatus}!`)
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast.error(error.message || 'Erro ao atualizar status da consulta')
    }
  }

  const handleEdit = (consulta: Consulta) => {
    const dataConsulta = new Date(consulta.dataConsulta)
    setEditingConsulta(consulta)
    setFormData({
      idPaciente: consulta.idPaciente,
      nomePaciente: consulta.nomePaciente,
      idProfissional: consulta.idProfissional,
      nomeProfissional: consulta.nomeProfissional,
      dataConsulta: format(dataConsulta, 'yyyy-MM-dd'),
      horaConsulta: format(dataConsulta, 'HH:mm'),
      status: consulta.status,
      observacoes: consulta.observacoes || '',
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConsulta) return

    if (!formData.dataConsulta || !formData.horaConsulta) {
      toast.error('Preencha data e hora')
      return
    }

    const dataHora = new Date(`${formData.dataConsulta}T${formData.horaConsulta}`)

    try {
      const statusToSave = (formData.status || '').charAt(0).toUpperCase() + (formData.status || '').slice(1)
      await updateDoc(doc(db, 'consultas_clinicas', editingConsulta.id), {
        data_consulta: format(dataHora, 'yyyy-MM-dd HH:mm'),
        status: statusToSave,
        obs: formData.observacoes,
      })
      await loadConsultas()
      setShowEditModal(false)
      setEditingConsulta(null)
      toast.success('Consulta atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar consulta:', error)
      toast.error('Erro ao atualizar consulta')
    }
  }

  const resetForm = () => {
    setFormData({
      idPaciente: '',
      nomePaciente: '',
      idProfissional: '',
      nomeProfissional: '',
      dataConsulta: '',
      horaConsulta: '',
      status: 'agendada',
      observacoes: '',
    })
    setEditingConsulta(null)
    setShowEditModal(false)
    setShowCreateModal(false)
    setSearchPaciente('')
    setSearchProfissional('')
    setShowPacientesList(false)
    setShowProfissionaisList(false)
  }

  const pacientesFiltrados = searchPaciente.trim() 
    ? pacientes.filter(p => 
        p.nome?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPaciente.toLowerCase())
      )
    : pacientes

  const profissionaisFiltrados = profissionais.filter(p => 
    p.nome?.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    (p.especialidade && p.especialidade.toLowerCase().includes(searchProfissional.toLowerCase()))
  )

  const handleCreateConsulta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    if (!formData.idPaciente || !formData.idProfissional || !formData.dataConsulta || !formData.horaConsulta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const dataHora = new Date(`${formData.dataConsulta}T${formData.horaConsulta}`)

    // Validar se a data/hora não é no passado
    if (isPastDateTime(dataHora)) {
      toast.error('Não é possível agendar consultas no passado')
      return
    }

    try {
      setLoading(true)
      const paciente = pacientes.find(p => p.id === formData.idPaciente)
      const profissional = profissionais.find(p => p.id === formData.idProfissional)

      if (!paciente || !profissional) {
        toast.error('Paciente ou profissional não encontrado')
        return
      }

      const idClinica = (userProfile as any).idClinica

      // Verificar conflitos de horário
      const consultasRef = collection(db, 'consultas_clinicas')
      const consultasQuery = query(
        consultasRef,
        where('id_profissional', '==', formData.idProfissional)
      )
      const consultasSnap = await getDocs(consultasQuery)
      
      const conflitos = consultasSnap.docs
        .map(doc => {
          const data = doc.data()
          const rawData = data.data_consulta || data.dataConsulta
          const parsedData = typeof rawData === 'string' ? new Date(rawData.replace(' ', 'T')) : (rawData?.toDate?.() || new Date())
          return {
            id: doc.id,
            dataConsulta: parsedData,
            status: data.status || '',
          }
        })
        .filter(c => {
          const status = String(c.status).toLowerCase()
          return status === 'agendada'
        })

      // Verificar se há conflito (mesmo profissional, mesmo horário, status agendada)
      const conflito = conflitos.find(c => {
        const diff = Math.abs(c.dataConsulta.getTime() - dataHora.getTime())
        return diff < 30 * 60 * 1000 // 30 minutos de diferença
      })

      if (conflito) {
        toast.error('Já existe uma consulta agendada para este profissional neste horário')
        return
      }

      // Criar consulta na coleção consultas_clinicas
      const consultaDataClinica = {
        id_paciente: formData.idPaciente,
        nm_paciente: paciente.nome,
        id_profissional: formData.idProfissional,
        nm_profissional: profissional.nome,
        id_clinica: idClinica,
        data_consulta: format(dataHora, 'yyyy-MM-dd HH:mm'),
        status: 'Agendada',
        obs: formData.observacoes || '',
        created_at: Timestamp.now(),
        tipo_atendimento: 'clinica',
      }

      const ref = await addDoc(collection(db, 'consultas_clinicas'), consultaDataClinica)
      await updateDoc(doc(db, 'consultas_clinicas', ref.id), { id: ref.id })

      resetForm()
      await loadConsultas()
      toast.success('Consulta agendada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error)
      toast.error(error.message || 'Erro ao agendar consulta')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout currentProfile="recepcionista">
        <div className="loading-state">Carregando...</div>
      </Layout>
    )
  }

  return (
    <Layout currentProfile="recepcionista">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-content"
      >
        <div className="dashboard-header">
          <h1>Dashboard da Recepção</h1>
          <p>Consultas do dia - {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>

        {/* Horários Disponíveis - Recepcionista pode gerenciar horários dos médicos */}
        {medicos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: '2rem' }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Selecionar Médico:
              </label>
              <select
                value={selectedMedicoId}
                onChange={(e) => setSelectedMedicoId(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  width: '100%',
                  maxWidth: '400px',
                }}
              >
                {medicos.map((medico) => (
                  <option key={medico.id} value={medico.id}>
                    {medico.nome} {medico.especialidade ? `- ${medico.especialidade}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedMedicoId && (
              <HorariosDisponiveis 
                profissionalId={selectedMedicoId}
                profissionalNome={medicos.find(m => m.id === selectedMedicoId)?.nome}
              />
            )}
          </motion.div>
        )}

        {/* Lista de Consultas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="section-card"
        >
          <div className="section-header">
            <h2>
              <Calendar size={20} />
              Consultas do Dia
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="new-consulta-button"
            >
              <Plus size={18} />
              Nova Consulta
            </motion.button>
          </div>
          
          {/* Filtro por Profissional */}
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: 'var(--color-surface)', 
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  Buscar por médico:
                </label>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none'
                    }} 
                  />
                  <input
                    type="text"
                    value={filtroProfissional}
                    onChange={(e) => setFiltroProfissional(e.target.value)}
                    placeholder="Digite o nome do médico..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      fontSize: '0.95rem',
                    }}
                  />
                  {filtroProfissional && (
                    <button
                      onClick={() => setFiltroProfissional('')}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ minWidth: '280px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  Ou selecione um médico:
                </label>
                <select
                  value={filtroProfissional}
                  onChange={(e) => setFiltroProfissional(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Todos os médicos</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.nome}>
                      {prof.nome} {prof.especialidade ? `- ${prof.especialidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filtroProfissional && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.5rem 0.75rem', 
                background: 'rgba(46, 134, 171, 0.1)', 
                borderRadius: '0.5rem',
                display: 'inline-block'
              }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  {consultasFiltradas.length} consulta(s) encontrada(s)
                </span>
              </div>
            )}
          </div>

          <div className="consultas-list">
            {consultasFiltradas.map((consulta, index) => (
              <motion.div
                key={consulta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="consulta-item"
              >
                <div className="consulta-main">
                  <div className="consulta-time">
                    <span className="time">{format(new Date(consulta.dataConsulta), "HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="consulta-info">
                    <h4>{consulta.nomePaciente}</h4>
                    <p>{consulta.nomeProfissional}</p>
                  </div>
                  <span className={`status-badge status-${consulta.status}`}>
                    {getStatusLabel(consulta.status)}
                  </span>
                </div>
                <div className="consulta-actions">
                  {consulta.status === 'agendada' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStatusChange(consulta.id, 'realizada')}
                        className="action-btn complete"
                      >
                        <CheckCircle size={18} />
                        Realizada
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStatusChange(consulta.id, 'cancelada')}
                        className="action-btn cancel"
                      >
                        <XCircle size={18} />
                        Cancelar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStatusChange(consulta.id, 'nao_compareceu')}
                        className="action-btn absent"
                      >
                        <XCircle size={18} />
                        Não compareceu
                      </motion.button>
                    </>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(consulta)}
                    className="action-btn edit"
                  >
                    <Edit2 size={18} />
                    Editar
                  </motion.button>
                </div>
              </motion.div>
            ))}
            {consultasFiltradas.length === 0 && consultas.length > 0 && (
              <p className="empty-state">Nenhuma consulta encontrada para o profissional selecionado</p>
            )}
            {consultas.length === 0 && (
              <p className="empty-state">Nenhuma consulta agendada para hoje</p>
            )}
          </div>
        </motion.div>

        {/* Modal de Edição */}
        <AnimatePresence>
          {showEditModal && editingConsulta && (
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
                  <h2>Editar Consulta</h2>
                  <button onClick={resetForm} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdate} className="modal-form">
                  <div className="form-group">
                    <label>Paciente</label>
                    <input
                      type="text"
                      value={editingConsulta.nomePaciente}
                      disabled
                      className="disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Profissional</label>
                    <input
                      type="text"
                      value={editingConsulta.nomeProfissional}
                      disabled
                      className="disabled"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Data *</label>
                      <input
                        type="date"
                        value={formData.dataConsulta}
                        onChange={(e) => setFormData({ ...formData, dataConsulta: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Hora *</label>
                      <input
                        type="time"
                        value={formData.horaConsulta}
                        onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Consulta['status'] })}
                    >
                      <option value="agendada">Agendada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="nao_compareceu">Não compareceu</option>
                      <option value="realizada">Realizada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetForm}
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

        {/* Modal de Criar Consulta */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    <Plus size={24} />
                    Nova Consulta
                  </h2>
                  <button onClick={() => setShowCreateModal(false)} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateConsulta} className="modal-body">
                  {/* Seleção de Paciente */}
                  <div className="form-group">
                    <label>
                      <User size={18} />
                      Paciente *
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
                          // Não limpar searchPaciente para permitir que o usuário continue digitando
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
                        {pacientes.length === 0 ? (
                          <div className="empty-state">
                            <p>Nenhum paciente vinculado</p>
                            <span>Você precisa ter pelo menos uma consulta com um paciente para ele aparecer aqui</span>
                          </div>
                        ) : pacientesFiltrados.length > 0 ? (
                          pacientesFiltrados.map((paciente) => (
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
                                {(paciente as any).telefone && (
                                  <p className="telefone">{(paciente as any).telefone}</p>
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

                  {/* Seleção de Profissional */}
                  <div className="form-group">
                    <label>
                      <Users size={18} />
                      Profissional *
                    </label>
                    <div className="search-wrapper">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        value={searchProfissional}
                        onChange={(e) => {
                          setSearchProfissional(e.target.value)
                          setShowProfissionaisList(true)
                        }}
                        onFocus={() => setShowProfissionaisList(true)}
                        placeholder="Buscar profissional..."
                        className="search-input"
                      />
                      {showProfissionaisList && profissionaisFiltrados.length > 0 && (
                        <div className="select-list">
                          {profissionaisFiltrados.map((profissional) => (
                            <motion.button
                              key={profissional.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  idProfissional: profissional.id,
                                  nomeProfissional: profissional.nome,
                                })
                                setSearchProfissional('')
                                setShowProfissionaisList(false)
                              }}
                              className={`select-item ${formData.idProfissional === profissional.id ? 'selected' : ''}`}
                            >
                              <Users size={16} />
                              <span>{profissional.nome} {profissional.especialidade ? `- ${profissional.especialidade}` : ''}</span>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formData.nomeProfissional && (
                      <p className="selected-item">Profissional selecionado: {formData.nomeProfissional}</p>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Data *</label>
                      <input
                        type="date"
                        value={formData.dataConsulta}
                        onChange={(e) => setFormData({ ...formData, dataConsulta: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Hora *</label>
                      <input
                        type="time"
                        value={formData.horaConsulta}
                        onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Consulta['status'] })}
                    >
                      <option value="agendada">Agendada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="realizada">Realizada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowCreateModal(false)}
                      className="cancel-button"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="save-button"
                      disabled={loading}
                    >
                      <Save size={18} />
                      {loading ? 'Criando...' : 'Criar Consulta'}
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
                  <div className="form-row">
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
                        const idClinica = (userProfile as any).idClinica
                        const payload: any = {
                          nome,
                          data_nascimento: newPaciente.data_nascimento || '',
                          telefone: newPaciente.telefone || '',
                          cpf: newPaciente.cpf || '',
                          endereco: newPaciente.endereco || '',
                          plano: newPaciente.plano || '',
                          perfil: 'paciente',
                          idClinica: idClinica || null,
                          created_at: Timestamp.now(),
                          dataCriacao: Timestamp.now(),
                        }
                        
                        const docRef = await addDoc(pacientesRef, payload)
                        const pacienteId = docRef.id
                        
                        const createdPaciente = {
                          id: pacienteId,
                          nome,
                          email: '', // Email não é mais obrigatório para agendamento
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
      </motion.div>

      <style>{`
        .dashboard-content {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }

        .dashboard-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: var(--color-text-muted);
          font-size: 1rem;
        }

        .section-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-card h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .new-consulta-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-consulta-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .consultas-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .consulta-item {
          padding: 1.5rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          transition: all 0.2s;
        }

        .consulta-item:hover {
          background: var(--color-surface-elevated);
        }

        .consulta-main {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .consulta-time {
          min-width: 80px;
        }

        .consulta-time .time {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary-medico);
        }

        .consulta-info {
          flex: 1;
        }

        .consulta-info h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .consulta-info p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-agendada {
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
        }

        .status-confirmada {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .status-realizada {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-cancelada {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .consulta-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.confirm {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .action-btn.confirm:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .action-btn.cancel {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .action-btn.cancel:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .action-btn.complete {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .action-btn.complete:hover {
          background: rgba(16, 185, 129, 0.2);
        }

        .action-btn.edit {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .action-btn.edit:hover {
          background: rgba(59, 130, 246, 0.2);
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
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
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
        .form-group select,
        .form-group textarea {
          width: 100%;
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
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group input:disabled,
        .form-group input.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
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

        .empty-state {
          text-align: center;
          color: var(--color-text-muted);
          padding: 2rem;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
        }

        .search-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .search-wrapper .search-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3.25rem !important;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .search-wrapper .search-input:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .edit-selection {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          z-index: 2;
        }

        .edit-selection:hover {
          color: var(--color-text);
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
          z-index: 10000;
          box-shadow: var(--shadow-lg);
        }

        .select-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 0.875rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          gap: 0.5rem;
        }

        .select-item:hover {
          background: var(--color-surface-elevated);
        }

        .select-item.selected {
          background: rgba(139, 92, 246, 0.1);
        }

        .select-item .name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .select-item .email {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .select-item .telefone {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .select-item span {
          font-size: 0.95rem;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .selected-item {
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text);
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 0.5rem;
          color: var(--color-primary-medico);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .empty-state {
          padding: 1rem;
          text-align: center;
        }

        .empty-state p {
          margin: 0 0 0.25rem 0;
          color: var(--color-text);
          font-weight: 500;
        }

        .empty-state span {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </Layout>
  )
}

