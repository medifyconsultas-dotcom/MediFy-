import HorariosDisponiveis from '@/components/HorariosDisponiveis'
import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/config'
import { Consulta } from '@/types'
import { exportToCSV, exportToExcel, exportToJSON, prepareConsultasForExport, prepareProntuariosForExport } from '@/utils/exportUtils'
import { format, parse } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle, Clock, Edit2, FileJson, FileSpreadsheet, FileText, Plus, Save, Search, Stethoscope, Trash2, User, UserCheck, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Prontuario {
  id: string
  idPaciente: string
  nomePaciente: string
  observacoes: string
  historico: Array<{
    data: Date | any
    profissional: string
    observacao: string
  }>
  dataRegistro: Date | any
  dataAtualizacao: Date | any
}

export default function DashboardProfissional() {
  const { userProfile } = useAuth()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [allConsultas, setAllConsultas] = useState<Consulta[]>([]) // Todas as consultas (sem filtro de data)
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje')
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [showProntuarioModal, setShowProntuarioModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [editFormData, setEditFormData] = useState({
    dataConsulta: '',
    horaConsulta: '',
    status: 'agendada' as Consulta['status'],
    observacoes: '',
  })
  const [showConsultaModal, setShowConsultaModal] = useState(false)
  const [showProntuarioCreateModal, setShowProntuarioCreateModal] = useState(false)
  const [prontuario, setProntuario] = useState<Prontuario | null>(null)
  const [loadingProntuario, setLoadingProntuario] = useState(false)
  const [statusConsulta, setStatusConsulta] = useState<Consulta['status']>('confirmada')
  const [editingProntuario, setEditingProntuario] = useState(false)
  const [editingHistorico, setEditingHistorico] = useState(false)
  const [prontuarioObservacoes, setProntuarioObservacoes] = useState('')
  const [historicoEdit, setHistoricoEdit] = useState<Array<{ data: Date | any, profissional: string, observacao: string }>>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [searchPaciente, setSearchPaciente] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
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
  const [consultaFormData, setConsultaFormData] = useState({
    idPaciente: '',
    nomePaciente: '',
    dataConsulta: '',
    horaConsulta: '',
    status: 'agendada' as Consulta['status'],
    observacoes: '',
  })
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
  const [prontuarioFormData, setProntuarioFormData] = useState({
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
  })

  useEffect(() => {
    if (userProfile) {
      loadConsultas()
      loadProntuarios()
      loadPacientes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, filter])

  useEffect(() => {
    if (!showPacientesList) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Não fechar se clicar no input ou na lista
      if (!target.closest('.search-wrapper') && !target.closest('.select-list') && !target.closest('.search-input')) {
        setShowPacientesList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPacientesList])

  // Recarregar pacientes vinculados quando o modal de consulta for aberto
  useEffect(() => {
    if (showConsultaModal && userProfile) {
      loadPacientes()
    }
  }, [showConsultaModal, userProfile?.id])

  const loadConsultas = async () => {
    if (!userProfile || userProfile.perfil !== 'profissional') return

    setLoading(true)
    try {
      // Profissional autônomo: usar a coleção 'consultas_autonomos' com campos snake_case
      const collectionName = 'consultas_autonomos'
      const consultasRef = collection(db, collectionName)
      const consultasQuery = query(
        consultasRef,
        where('id_profissional', '==', userProfile.id)
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
          sourceCollection: collectionName,
          _raw: data,
        } as Consulta
      }) as Consulta[]

      // Filtrar por data
      const agora = new Date()
      switch (filter) {
        case 'hoje':
          consultasData = consultasData.filter(c => {
            const data = new Date(c.dataConsulta)
            return data.toDateString() === agora.toDateString()
          })
          break
        case 'semana':
          const semanaInicio = new Date(agora)
          semanaInicio.setDate(agora.getDate() - agora.getDay())
          consultasData = consultasData.filter(c => new Date(c.dataConsulta) >= semanaInicio)
          break
        case 'mes':
          consultasData = consultasData.filter(c => {
            const data = new Date(c.dataConsulta)
            return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear()
          })
          break
      }

      // Salvar todas as consultas (sem filtro de data)
      setAllConsultas(consultasData)

      // Marcar automaticamente como realizada consultas passadas que ainda estão agendadas ou confirmadas
      const consultasParaAtualizar: { id: string, collection: string }[] = []
      
      consultasData.forEach(c => {
        const dataConsulta = new Date(c.dataConsulta)
        const statusLower = String(c.status || '').toLowerCase()
        if (dataConsulta < agora && (statusLower === 'agendada' || statusLower === 'confirmada')) {
          consultasParaAtualizar.push({ id: c.id, collection: collectionName })
        }
      })

      // Atualizar consultas passadas
      if (consultasParaAtualizar.length > 0) {
        await Promise.all(consultasParaAtualizar.map(async ({ id, collection }) => {
          try {
            await updateDoc(doc(db, collection, id), {
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
          where('id_profissional', '==', userProfile.id)
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
            sourceCollection: collectionName,
            _raw: data,
          } as Consulta
        }) as Consulta[]

        // Reaplicar filtros
        switch (filter) {
          case 'hoje':
            consultasData = consultasData.filter(c => {
              const data = new Date(c.dataConsulta)
              return data.toDateString() === agora.toDateString()
            })
            break
          case 'semana':
            const semanaInicio = new Date(agora)
            semanaInicio.setDate(agora.getDate() - agora.getDay())
            consultasData = consultasData.filter(c => new Date(c.dataConsulta) >= semanaInicio)
            break
          case 'mes':
            consultasData = consultasData.filter(c => {
              const data = new Date(c.dataConsulta)
              return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear()
            })
            break
        }
      }

      // Ordenar por data
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

  const loadProntuario = async (idPaciente: string) => {
    if (!userProfile) return

    setLoadingProntuario(true)
    try {
      // Buscar prontuário do paciente do profissional autônomo
      const prontuariosRef = collection(db, 'prontuarios')
      const prontuariosQuery = query(
        prontuariosRef,
        where('idPaciente', '==', idPaciente),
        where('idProfissional', '==', userProfile.id)
      )
      const prontuariosSnap = await getDocs(prontuariosQuery)
      
      if (prontuariosSnap.docs.length > 0) {
        const prontuarioDoc = prontuariosSnap.docs[0]
        const data = prontuarioDoc.data()
        
        const prontuarioData = {
          id: prontuarioDoc.id,
          ...data,
          dataRegistro: data.dataRegistro?.toDate ? data.dataRegistro.toDate() : (data.dataRegistro instanceof Date ? data.dataRegistro : new Date()),
          dataAtualizacao: data.dataAtualizacao?.toDate ? data.dataAtualizacao.toDate() : (data.dataAtualizacao instanceof Date ? data.dataAtualizacao : new Date()),
          historico: (data.historico || []).map((h: any) => ({
            ...h,
            data: h.data?.toDate ? h.data.toDate() : (h.data instanceof Date ? h.data : new Date()),
          })),
        } as Prontuario
        setProntuario(prontuarioData)
        // NÃO preencher o campo de observações - deixar vazio para permitir adicionar nova observação
        setProntuarioObservacoes('')
        setHistoricoEdit(prontuarioData.historico || [])
      } else {
        setProntuario(null)
        setProntuarioObservacoes('')
        setHistoricoEdit([])
      }
    } catch (error) {
      console.error('Erro ao carregar prontuário:', error)
      toast.error('Erro ao carregar prontuário')
      setProntuario(null)
    } finally {
      setLoadingProntuario(false)
    }
  }

  const handleOpenProntuario = async (consulta: Consulta) => {
    setSelectedConsulta(consulta)
    setShowProntuarioModal(true)
    setEditingProntuario(false)
    setEditingHistorico(false)
    setProntuarioObservacoes('')
    setHistoricoEdit([])
    await loadProntuario(consulta.idPaciente)
  }

  const handleSaveProntuario = async () => {
    if (!selectedConsulta || !userProfile) return

    try {
      setLoadingProntuario(true)
      const observacoes = prontuarioObservacoes.trim()

      if (prontuario) {
        // Atualizar prontuário existente
        let historicoParaSalvar = editingHistorico 
          ? historicoEdit.map(h => ({
              ...h,
              data: h.data instanceof Date ? Timestamp.fromDate(h.data) : (h.data && typeof h.data === 'object' && 'toDate' in h.data ? h.data : Timestamp.fromDate(new Date(h.data as any))),
            }))
          : (prontuario.historico || []).map(h => ({
              ...h,
              data: h.data instanceof Date ? Timestamp.fromDate(h.data) : (h.data && typeof h.data === 'object' && 'toDate' in h.data ? h.data : Timestamp.fromDate(new Date(h.data as any))),
            }))

        // SEMPRE adicionar nova observação ao histórico se não estiver vazia
        if (observacoes) {
          historicoParaSalvar.push({
            data: Timestamp.now(),
            profissional: userProfile.nome,
            observacao: observacoes,
          })
        }

        await updateDoc(doc(db, 'prontuarios', prontuario.id), {
          observacoes: observacoes,
          historico: historicoParaSalvar,
          dataAtualizacao: Timestamp.now(),
        })
        toast.success('Prontuário atualizado com sucesso!')
      } else {
        // Criar novo prontuário
        const pacienteDoc = await getDoc(doc(db, 'pacientes', selectedConsulta.idPaciente))
        if (!pacienteDoc.exists()) {
          toast.error('Paciente não encontrado')
          setLoadingProntuario(false)
          return
        }
        const pacienteData = pacienteDoc.data()

        const historicoInicial = editingHistorico && historicoEdit.length > 0
          ? historicoEdit.map(h => ({
              data: h.data instanceof Date ? Timestamp.fromDate(h.data) : Timestamp.now(),
              profissional: h.profissional || userProfile.nome,
              observacao: h.observacao || observacoes,
            }))
          : [
              {
                data: Timestamp.now(),
                profissional: userProfile.nome,
                observacao: observacoes,
              },
            ]

        const novoProntuario = {
          idPaciente: selectedConsulta.idPaciente,
          nomePaciente: pacienteData.nome,
          dataNascimento: pacienteData.dataNascimento ? (pacienteData.dataNascimento.toDate ? Timestamp.fromDate(pacienteData.dataNascimento.toDate()) : pacienteData.dataNascimento) : null,
          telefone: pacienteData.telefone || '',
          cpf: pacienteData.cpf || '',
          idProfissional: userProfile.id,
          nomeProfissional: userProfile.nome,
          idClinica: null, // Profissional autônomo NUNCA tem idClinica
          observacoes: observacoes,
          historico: historicoInicial,
          dataRegistro: Timestamp.now(),
          dataAtualizacao: Timestamp.now(),
        }

        await addDoc(collection(db, 'prontuarios'), novoProntuario)
        toast.success('Prontuário criado com sucesso!')
      }

      await loadProntuario(selectedConsulta.idPaciente)
      setEditingProntuario(false)
      setEditingHistorico(false)
    } catch (error: any) {
      console.error('Erro ao salvar prontuário:', error)
      toast.error(error.message || 'Erro ao salvar prontuário')
    } finally {
      setLoadingProntuario(false)
    }
  }

  const handleUpdateHistoricoItem = (index: number, field: 'observacao' | 'profissional', value: string) => {
    const newHistorico = [...historicoEdit]
    newHistorico[index] = {
      ...newHistorico[index],
      [field]: value,
    }
    setHistoricoEdit(newHistorico)
  }

  const handleRemoveHistoricoItem = (index: number) => {
    const newHistorico = historicoEdit.filter((_, i) => i !== index)
    setHistoricoEdit(newHistorico)
  }

  const handleAddHistoricoItem = () => {
    setHistoricoEdit([
      ...historicoEdit,
      {
        data: new Date(),
        profissional: userProfile?.nome || '',
        observacao: '',
      },
    ])
  }

  const handleOpenStatusModal = (consulta: Consulta) => {
    setSelectedConsulta(consulta)
    setStatusConsulta(consulta.status)
    setShowStatusModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedConsulta) return

    try {
      // Atualizar status na coleção correta (autônomos)
      const targetCollection = (selectedConsulta as any).sourceCollection || 'consultas_autonomos'
      const statusToSave = targetCollection === 'consultas_autonomos' ? (String(statusConsulta || '').charAt(0).toUpperCase() + String(statusConsulta || '').slice(1)) : statusConsulta
      await updateDoc(doc(db, targetCollection, selectedConsulta.id), {
        status: statusToSave,
      })
      toast.success('Status atualizado com sucesso!')
      setShowStatusModal(false)
      setSelectedConsulta(null)
      await loadConsultas()
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const handleEdit = (consulta: Consulta) => {
    const dataConsulta = new Date(consulta.dataConsulta)
    setEditingConsulta(consulta)
    setEditFormData({
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

    if (!editFormData.dataConsulta || !editFormData.horaConsulta) {
      toast.error('Preencha data e hora')
      return
    }

    const dataHora = new Date(`${editFormData.dataConsulta}T${editFormData.horaConsulta}`)

    try {
      const targetCollection = (editingConsulta as any).sourceCollection || 'consultas_autonomos'
      const statusToSave = targetCollection === 'consultas_autonomos' ? (String(editFormData.status || '').charAt(0).toUpperCase() + String(editFormData.status || '').slice(1)) : editFormData.status
      await updateDoc(doc(db, targetCollection, editingConsulta.id), {
        data_consulta: format(dataHora, 'yyyy-MM-dd HH:mm'),
        status: statusToSave,
        obs: editFormData.observacoes,
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

  const resetEditForm = () => {
    setEditFormData({
      dataConsulta: '',
      horaConsulta: '',
      status: 'agendada',
      observacoes: '',
    })
    setEditingConsulta(null)
    setShowEditModal(false)
  }

  const getStatusLabel = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada':
        return 'Agendada'
      case 'confirmada':
        return 'Confirmada'
      case 'nao_compareceu':
        return 'Não compareceu'
      case 'realizada':
        return 'Realizada'
      case 'cancelada':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getStatusIcon = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada':
        return <Clock size={16} />
      case 'confirmada':
        return <UserCheck size={16} />
      case 'realizada':
        return <CheckCircle size={16} />
      case 'nao_compareceu':
        return <XCircle size={16} />
      case 'cancelada':
        return <X size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const loadProntuarios = async () => {
    if (!userProfile || userProfile.perfil !== 'profissional') return

    try {
      const prontuariosRef = collection(db, 'prontuarios')
      const prontuariosQuery = query(
        prontuariosRef,
        where('idProfissional', '==', userProfile.id),
        where('idClinica', '==', null)
      )
      const prontuariosSnap = await getDocs(prontuariosQuery)
      
      const prontuariosData = prontuariosSnap.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          dataRegistro: data.dataRegistro?.toDate ? data.dataRegistro.toDate() : (data.dataRegistro instanceof Date ? data.dataRegistro : new Date()),
          dataAtualizacao: data.dataAtualizacao?.toDate ? data.dataAtualizacao.toDate() : (data.dataAtualizacao instanceof Date ? data.dataAtualizacao : new Date()),
          historico: (data.historico || []).map((h: any) => ({
            ...h,
            data: h.data?.toDate ? h.data.toDate() : (h.data instanceof Date ? h.data : new Date()),
          })),
        } as Prontuario
      })
      
      setProntuarios(prontuariosData)
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error)
      toast.error('Erro ao carregar prontuários')
    }
  }

  const loadPacientes = async () => {
    if (!userProfile || !userProfile.id) {
      console.warn('userProfile ou userProfile.id não está disponível')
      return
    }
    
    try {
      const profissionalId = String(userProfile.id).trim()
      console.log('Carregando pacientes vinculados para profissional:', profissionalId)
      
      // Para profissional autônomo, buscar apenas pacientes que já tiveram consultas com ele
      const consultasRef = collection(db, 'consultas_autonomos')
      let consultasSnap
      
      try {
        // Tentar query filtrada primeiro
        const consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', profissionalId)
        )
        consultasSnap = await getDocs(consultasQuery)
        console.log('Consultas encontradas com query filtrada:', consultasSnap.docs.length)
      } catch (queryError) {
        console.warn('Erro na query filtrada, tentando buscar todas:', queryError)
        // Se a query falhar, buscar todas e filtrar manualmente
        consultasSnap = await getDocs(consultasRef)
        console.log('Total de consultas na coleção:', consultasSnap.docs.length)
      }
      
      const pacientesIdsVinculados = new Set<string>()
      
      consultasSnap.docs.forEach(doc => {
        const data = doc.data()
        // Verificar ambos os formatos de campo para id_profissional
        const consultaProfissionalId = String(data.id_profissional || data.idProfissional || '').trim()
        
        // Comparar IDs (garantir que ambos sejam strings e comparáveis)
        if (consultaProfissionalId && consultaProfissionalId === profissionalId) {
          console.log('Consulta pertence ao profissional:', { 
            consultaId: doc.id, 
            id_profissional: consultaProfissionalId, 
            id_paciente: data.id_paciente || data.idPaciente 
          })
          
          // Verificar ambos os formatos de campo para id_paciente
          const pacienteId = String(data.id_paciente || data.idPaciente || '').trim()
          if (pacienteId) {
            pacientesIdsVinculados.add(pacienteId)
            console.log('Paciente ID adicionado:', pacienteId)
          } else {
            console.warn('Consulta sem id_paciente:', doc.id, data)
          }
        } else {
          // Log apenas para debug (pode ser muito verboso)
          // console.log('Consulta não pertence ao profissional:', { consultaId: doc.id, consultaProfissionalId, profissionalId })
        }
      })
      
      console.log('Total de pacientes únicos vinculados:', pacientesIdsVinculados.size)
      console.log('IDs dos pacientes:', Array.from(pacientesIdsVinculados))
      
      // Buscar apenas os pacientes que têm consultas
      if (pacientesIdsVinculados.size > 0) {
        const pacientesData: any[] = []
        for (const pacienteId of pacientesIdsVinculados) {
          try {
            const pacienteDoc = await getDoc(doc(db, 'pacientes', pacienteId))
            if (pacienteDoc.exists()) {
              const pacienteData = pacienteDoc.data()
              pacientesData.push({
                id: pacienteDoc.id,
                ...pacienteData,
              })
              console.log('Paciente carregado:', pacienteDoc.id, pacienteData?.nome)
            } else {
              console.warn('Paciente não encontrado no Firestore:', pacienteId)
            }
          } catch (err) {
            console.error(`Erro ao buscar paciente ${pacienteId}:`, err)
          }
        }
        console.log('Total de pacientes carregados:', pacientesData.length)
        setPacientes(pacientesData)
      } else {
        console.log('Nenhum paciente vinculado encontrado. Verificando consultas...')
        // Debug: mostrar algumas consultas para entender o problema
        if (consultasSnap.docs.length > 0) {
          console.log('Primeiras 3 consultas encontradas:', consultasSnap.docs.slice(0, 3).map(d => ({
            id: d.id,
            id_profissional: d.data().id_profissional,
            idProfissional: d.data().idProfissional,
            id_paciente: d.data().id_paciente,
            idPaciente: d.data().idPaciente,
          })))
        }
        setPacientes([])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast.error('Erro ao carregar pacientes vinculados')
    }
  }

  // Buscar horários disponíveis do profissional
  const loadHorariosDisponiveis = async (dataSelecionada?: string) => {
    if (!userProfile) return

    try {
      const horariosRef = collection(db, 'profissionais', userProfile.id, 'horarios')
      const horariosSnap = await getDocs(horariosRef)
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const horariosDisponiveisList: string[] = []
      
      horariosSnap.docs.forEach(doc => {
        const horarioData = doc.data()
        
        // Horários recorrentes (por dia da semana)
        if (horarioData.tipo === 'recorrente' && horarioData.diaSemana !== undefined) {
          if (dataSelecionada) {
            const dataObj = parse(dataSelecionada, 'yyyy-MM-dd', new Date())
            const diaSemanaData = dataObj.getDay() // 0=domingo, 1=segunda, ..., 6=sábado
            
            // Comparar dia da semana (garantir que ambos sejam números)
            const horarioDiaSemana = Number(horarioData.diaSemana)
            
            // Verificar se o dia da semana da data selecionada corresponde ao horário recorrente
            if (diaSemanaData === horarioDiaSemana && dataObj >= hoje) {
              if (horarioData.disponivel !== false && horarioData.hora) {
                horariosDisponiveisList.push(horarioData.hora)
              }
            }
          }
        }
        
        // Horários específicos (por data)
        if (horarioData.tipo === 'especifico' && horarioData.data) {
          if (dataSelecionada) {
            // Normalizar formato de data (pode vir como YYYY-MM-DD ou DD/MM/YYYY)
            let horarioDataFormatada = horarioData.data
            if (horarioData.data.includes('/')) {
              // Converter DD/MM/YYYY para YYYY-MM-DD
              const [dia, mes, ano] = horarioData.data.split('/')
              horarioDataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
            }
            
            if (horarioDataFormatada === dataSelecionada) {
              const dataObj = parse(horarioDataFormatada, 'yyyy-MM-dd', new Date())
              if (dataObj >= hoje && horarioData.disponivel !== false && horarioData.hora) {
                horariosDisponiveisList.push(horarioData.hora)
              }
            }
          }
        }
        
        // Se não tem tipo definido, tratar como específico (compatibilidade com dados antigos)
        if (!horarioData.tipo && horarioData.data) {
          if (dataSelecionada) {
            let horarioDataFormatada = horarioData.data
            if (horarioData.data.includes('/')) {
              const [dia, mes, ano] = horarioData.data.split('/')
              horarioDataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
            }
            
            if (horarioDataFormatada === dataSelecionada) {
              const dataObj = parse(horarioDataFormatada, 'yyyy-MM-dd', new Date())
              if (dataObj >= hoje && horarioData.disponivel !== false && horarioData.hora) {
                horariosDisponiveisList.push(horarioData.hora)
              }
            }
          }
        }
      })
      
      // Remover duplicatas e ordenar
      const horariosUnicos = Array.from(new Set(horariosDisponiveisList)).sort()
      setHorariosDisponiveis(horariosUnicos)
      
      // Buscar horários ocupados (consultas agendadas/confirmadas)
      if (dataSelecionada) {
        const consultasRef = collection(db, 'consultas_autonomos')
        const consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', userProfile.id)
        )
        const consultasSnap = await getDocs(consultasQuery)
        
        const horariosOcupadosList: string[] = []
        consultasSnap.docs.forEach(doc => {
          const consultaData = doc.data()
          const rawDataConsulta = consultaData.data_consulta || consultaData.dataConsulta
          const parsedDataConsulta = typeof rawDataConsulta === 'string' 
            ? new Date(rawDataConsulta.replace(' ', 'T')) 
            : (rawDataConsulta?.toDate?.() || new Date())
          
          const dataConsultaStr = format(parsedDataConsulta, 'yyyy-MM-dd')
          const horaConsultaStr = format(parsedDataConsulta, 'HH:mm')
          
          if (dataConsultaStr === dataSelecionada) {
            const status = String(consultaData.status || '').toLowerCase()
            if (status === 'agendada' || status === 'confirmada') {
              horariosOcupadosList.push(horaConsultaStr)
            }
          }
        })
        
        setHorariosOcupados(horariosOcupadosList)
      }
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error)
    }
  }

  const handleExportConsultas = (format: 'json' | 'csv' | 'excel') => {
    const data = prepareConsultasForExport(allConsultas)
    const filename = `consultas_${userProfile?.nome?.replace(/\s+/g, '_') || 'profissional'}`
    
    switch (format) {
      case 'json':
        exportToJSON(data, filename)
        toast.success('Consultas exportadas para JSON!')
        break
      case 'csv':
        exportToCSV(data, filename)
        toast.success('Consultas exportadas para CSV!')
        break
      case 'excel':
        exportToExcel(data, filename)
        toast.success('Consultas exportadas para Excel!')
        break
    }
  }

  const handleExportProntuarios = (format: 'json' | 'csv' | 'excel') => {
    const data = prepareProntuariosForExport(prontuarios)
    const filename = `prontuarios_${userProfile?.nome?.replace(/\s+/g, '_') || 'profissional'}`
    
    switch (format) {
      case 'json':
        exportToJSON(data, filename)
        toast.success('Prontuários exportados para JSON!')
        break
      case 'csv':
        exportToCSV(data, filename)
        toast.success('Prontuários exportados para CSV!')
        break
      case 'excel':
        exportToExcel(data, filename)
        toast.success('Prontuários exportados para Excel!')
        break
    }
  }

  const handleCreateConsulta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    if (!consultaFormData.idPaciente || !consultaFormData.dataConsulta || !consultaFormData.horaConsulta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Validar se a data não é no passado
    const dataSelecionada = new Date(consultaFormData.dataConsulta)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (dataSelecionada < hoje) {
      toast.error('Não é possível agendar consultas no passado')
      return
    }

    // Validar se o horário está disponível
    if (!horariosDisponiveis.includes(consultaFormData.horaConsulta)) {
      toast.error('Este horário não está disponível')
      return
    }

    // Validar se o horário não está ocupado
    if (horariosOcupados.includes(consultaFormData.horaConsulta)) {
      toast.error('Este horário já está ocupado')
      return
    }

    try {
      const paciente = pacientes.find(p => p.id === consultaFormData.idPaciente)
      if (!paciente) {
        toast.error('Paciente não encontrado')
        return
      }

      const dataHora = new Date(`${consultaFormData.dataConsulta}T${consultaFormData.horaConsulta}`)

      // Profissional autônomo -> salvar em consultas_autonomos com campos do banco
      const idClinica = null
      const targetCollectionName = idClinica === null ? 'consultas_autonomos' : 'consultas_clinicas'
      const consultaDataAutonomo = {
        id_paciente: consultaFormData.idPaciente,
        nm_paciente: paciente.nome,
        id_profissional: userProfile.id,
        nm_profissional: userProfile.nome,
        id_clinica: idClinica,
        data_consulta: format(dataHora, 'yyyy-MM-dd HH:mm'),
        status: (consultaFormData.status || '').charAt(0).toUpperCase() + (consultaFormData.status || '').slice(1),
        obs: consultaFormData.observacoes || '',
        created_at: Timestamp.now(),
        tipo_atendimento: 'autonomo',
      }

      const ref = await addDoc(collection(db, targetCollectionName), consultaDataAutonomo)
      await updateDoc(doc(db, targetCollectionName, ref.id), { id: ref.id })

      toast.success('Consulta criada com sucesso!')
      setShowConsultaModal(false)
      setConsultaFormData({
        idPaciente: '',
        nomePaciente: '',
        dataConsulta: '',
        horaConsulta: '',
        status: 'agendada',
        observacoes: '',
      })
      setHorariosDisponiveis([])
      setHorariosOcupados([])
      await loadConsultas()
      await loadPacientes() // Atualizar lista de pacientes vinculados
    } catch (error: any) {
      console.error('Erro ao criar consulta:', error)
      toast.error(error.message || 'Erro ao criar consulta')
    }
  }

  const handleCreateProntuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    if (!prontuarioFormData.idPaciente) {
      toast.error('Selecione um paciente')
      return
    }

    try {
      const paciente = pacientes.find(p => p.id === prontuarioFormData.idPaciente)
      if (!paciente) {
        toast.error('Paciente não encontrado')
        return
      }

      const novoProntuario = {
        idPaciente: prontuarioFormData.idPaciente,
        nomePaciente: paciente.nome,
        dataNascimento: paciente.dataNascimento ? (paciente.dataNascimento.toDate ? Timestamp.fromDate(paciente.dataNascimento.toDate()) : paciente.dataNascimento) : null,
        telefone: paciente.telefone || '',
        cpf: paciente.cpf || '',
        idProfissional: userProfile.id,
        nomeProfissional: userProfile.nome,
        idClinica: null,
        titulo: prontuarioFormData.titulo || null,
        conteudo: prontuarioFormData.conteudo || null,
        anamnese: prontuarioFormData.anamnese || null,
        exame_fisico: prontuarioFormData.exame_fisico || null,
        sinais_vitais: prontuarioFormData.sinais_vitais || null,
        diagnosticos: prontuarioFormData.diagnosticos || null,
        prescricoes: prontuarioFormData.prescricoes || null,
        medicamentos: prontuarioFormData.medicamentos || null,
        alergias: prontuarioFormData.alergias || null,
        antecedentes: prontuarioFormData.antecedentes || null,
        exames_solicitados: prontuarioFormData.exames_solicitados || null,
        plano: prontuarioFormData.plano || null,
        follow_up: prontuarioFormData.follow_up || null,
        observacoes: prontuarioFormData.observacoes.trim() || null,
        historico: prontuarioFormData.observacoes.trim() ? [
          {
            data: Timestamp.now(),
            profissional: userProfile.nome,
            observacao: prontuarioFormData.observacoes.trim(),
          },
        ] : [],
        dataRegistro: Timestamp.now(),
        dataAtualizacao: Timestamp.now(),
      }

      await addDoc(collection(db, 'prontuarios'), novoProntuario)
      toast.success('Prontuário criado com sucesso!')
      setShowProntuarioCreateModal(false)
      setProntuarioFormData({
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
      })
      await loadProntuarios()
    } catch (error: any) {
      console.error('Erro ao criar prontuário:', error)
      toast.error(error.message || 'Erro ao criar prontuário')
    }
  }

  const pacientesFiltrados = searchPaciente.trim() 
    ? pacientes.filter(p => 
        p.nome?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPaciente.toLowerCase())
      )
    : pacientes

  if (loading) {
    return (
      <Layout currentProfile="profissional">
        <div className="loading-state">Carregando...</div>
      </Layout>
    )
  }

  const consultasHoje = consultas.filter(c => {
    const data = new Date(c.dataConsulta)
    const hoje = new Date()
    return data.toDateString() === hoje.toDateString()
  })

  return (
    <Layout currentProfile="profissional">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-content"
      >
        <div className="dashboard-header">
          <div>
            <h1>Dashboard Profissional</h1>
            <p>Bem-vindo, {userProfile?.nome}</p>
          </div>
          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowConsultaModal(true)
                loadPacientes() // Recarregar pacientes vinculados ao abrir o modal
              }}
              className="action-button primary"
            >
              <Plus size={18} />
              Nova Consulta
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProntuarioCreateModal(true)}
              className="action-button primary"
            >
              <FileText size={18} />
              Novo Prontuário
            </motion.button>
          </div>
        </div>

        {/* Seção de Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="quick-actions-section"
        >
          <h3>Ações Rápidas</h3>
          <div className="quick-actions-grid">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="quick-action-card"
            >
              <div className="quick-action-header">
                <FileText size={24} color="#8b5cf6" />
                <h4>Exportar Consultas</h4>
              </div>
              <div className="quick-action-buttons">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportConsultas('json')}
                  className="export-btn"
                >
                  <FileJson size={16} />
                  JSON
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportConsultas('csv')}
                  className="export-btn"
                >
                  <FileSpreadsheet size={16} />
                  CSV
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportConsultas('excel')}
                  className="export-btn"
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="quick-action-card"
            >
              <div className="quick-action-header">
                <Stethoscope size={24} color="#8b5cf6" />
                <h4>Exportar Prontuários</h4>
              </div>
              <div className="quick-action-buttons">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportProntuarios('json')}
                  className="export-btn"
                >
                  <FileJson size={16} />
                  JSON
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportProntuarios('csv')}
                  className="export-btn"
                >
                  <FileSpreadsheet size={16} />
                  CSV
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExportProntuarios('excel')}
                  className="export-btn"
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Horários Disponíveis */}
        {userProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: '2rem' }}
          >
            <HorariosDisponiveis 
              profissionalId={userProfile.id}
              profissionalNome={userProfile.nome}
            />
          </motion.div>
        )}

        {/* Filtros */}
        <div className="filter-tabs">
          {(['hoje', 'semana', 'mes', 'todos'] as const).map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
            >
              {f === 'hoje' ? 'Hoje' : f === 'semana' ? 'Esta Semana' : f === 'mes' ? 'Este Mês' : 'Todas'}
            </motion.button>
          ))}
        </div>

        {/* Cards de Estatísticas */}
        <div className="stats-grid">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Calendar size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultasHoje.length}</h3>
              <p>Consultas Hoje</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Clock size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultas.filter(c => c.status === 'agendada' || c.status === 'confirmada').length}</h3>
              <p>Pendentes</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <User size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultas.filter(c => c.status === 'realizada').length}</h3>
              <p>Realizadas</p>
            </div>
          </motion.div>
        </div>

        {/* Lista de Consultas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="section-card"
        >
          <div className="section-header">
            <h2>
              <FileText size={20} />
              Minha Agenda
            </h2>
          
          </div>
          <div className="consultas-list">
            {consultas.map((consulta, index) => (
              <motion.div
                key={consulta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="consulta-item"
              >
                <div className="consulta-time">
                  <Calendar size={16} />
                  <span>{format(new Date(consulta.dataConsulta), "HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="consulta-info">
                  <h4>{consulta.nomePaciente}</h4>
                  <p>{format(new Date(consulta.dataConsulta), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  <span className={`status-badge status-${consulta.status}`}>
                    {getStatusIcon(consulta.status)}
                    {getStatusLabel(consulta.status)}
                  </span>
                </div>
                <div className="consulta-actions">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenProntuario(consulta)}
                    className="action-btn prontuario-btn"
                  >
                    <FileText size={18} />
                    Prontuário
                  </motion.button>
                 
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenStatusModal(consulta)}
                    className="action-btn status-btn"
                  >
                    <Edit2 size={18} />
                    Status
                  </motion.button>

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
            {consultas.length === 0 && (
              <p className="empty-state">Nenhuma consulta encontrada</p>
            )}
          </div>
        </motion.div>

        {/* Modal de Prontuário - Mesmo código do DashboardMedicoEnfermeiro */}
        <AnimatePresence>
          {showProntuarioModal && selectedConsulta && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => {
                setShowProntuarioModal(false)
                setSelectedConsulta(null)
                setProntuario(null)
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
                    Prontuário - {selectedConsulta.nomePaciente}
                  </h2>
                  <button
                    onClick={() => {
                      setShowProntuarioModal(false)
                      setSelectedConsulta(null)
                      setProntuario(null)
                    }}
                    className="close-button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  {loadingProntuario ? (
                    <div className="loading-state">Carregando prontuário...</div>
                  ) : editingProntuario || !prontuario ? (
                    <div className="prontuario-edit">
                      <div className="form-group">
                        <label>
                          Nova Observação {prontuario && <span className="label-hint">(será adicionada ao histórico ao salvar)</span>}
                        </label>
                        <textarea
                          value={prontuarioObservacoes}
                          onChange={(e) => setProntuarioObservacoes(e.target.value)}
                          rows={6}
                          placeholder={prontuario 
                            ? "Digite uma nova observação para adicionar ao histórico..." 
                            : "Digite as observações do prontuário..."}
                          className="prontuario-textarea"
                        />
                        {prontuario && prontuario.observacoes && (
                          <div className="current-observations-hint">
                            <p><strong>Observação atual:</strong> {prontuario.observacoes}</p>
                            <p className="hint-text">Digite acima para adicionar uma nova observação ao histórico</p>
                          </div>
                        )}
                      </div>

                      {editingHistorico && (
                        <div className="form-group historico-editor">
                          <div className="historico-header">
                            <label>
                              <Calendar size={18} />
                              Histórico de Observações
                            </label>
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
                          </div>
                          {historicoEdit.length === 0 ? (
                            <div className="historico-empty">
                              <p>Nenhum registro no histórico</p>
                            </div>
                          ) : (
                            <div className="historico-editor-list">
                              {historicoEdit.map((item, index) => (
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
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleRemoveHistoricoItem(index)}
                                      className="remove-historico-button"
                                    >
                                      <Trash2 size={14} />
                                    </motion.button>
                                  </div>
                                  <div className="historico-editor-content">
                                    <div className="form-group-small">
                                      <label>Profissional</label>
                                      <input
                                        type="text"
                                        value={item.profissional}
                                        onChange={(e) => handleUpdateHistoricoItem(index, 'profissional', e.target.value)}
                                        placeholder="Nome do profissional"
                                      />
                                    </div>
                                    <div className="form-group-small">
                                      <label>Observação</label>
                                      <textarea
                                        value={item.observacao}
                                        onChange={(e) => handleUpdateHistoricoItem(index, 'observacao', e.target.value)}
                                        placeholder="Observação do registro..."
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="prontuario-edit-actions">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingHistorico(!editingHistorico)
                            if (!editingHistorico) {
                              if (prontuario) {
                                setHistoricoEdit(prontuario.historico || [])
                              } else {
                                if (prontuarioObservacoes.trim()) {
                                  setHistoricoEdit([{
                                    data: new Date(),
                                    profissional: userProfile?.nome || '',
                                    observacao: prontuarioObservacoes.trim(),
                                  }])
                                } else {
                                  setHistoricoEdit([])
                                }
                              }
                            }
                          }}
                          className="toggle-historico-button"
                        >
                          {editingHistorico ? 'Ocultar Histórico' : 'Editar/Adicionar ao Histórico'}
                        </motion.button>
                      </div>

                      <div className="modal-actions">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingProntuario(false)
                            setEditingHistorico(false)
                            if (prontuario) {
                              setProntuarioObservacoes(prontuario.observacoes || '')
                              setHistoricoEdit(prontuario.historico || [])
                            } else {
                              setProntuarioObservacoes('')
                              setHistoricoEdit([])
                            }
                          }}
                          className="cancel-button"
                        >
                          Cancelar
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveProntuario}
                          disabled={loadingProntuario}
                          className="save-button"
                        >
                          <Save size={18} />
                          {loadingProntuario 
                            ? 'Salvando...' 
                            : prontuario 
                              ? (editingHistorico ? 'Salvar Alterações' : 'Adicionar Observação') 
                              : 'Criar Prontuário'}
                        </motion.button>
                      </div>
                    </div>
                  ) : prontuario ? (
                    <div className="prontuario-content">
                      <div className="prontuario-section">
                        <div className="prontuario-section-header">
                          <h3>Observações</h3>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setEditingProntuario(true)
                              setProntuarioObservacoes(prontuario.observacoes || '')
                            }}
                            className="edit-button"
                          >
                            <Edit2 size={16} />
                            Editar
                          </motion.button>
                        </div>
                        <p>{prontuario.observacoes || 'Nenhuma observação registrada'}</p>
                      </div>

                      {prontuario.historico && prontuario.historico.length > 0 && (
                        <div className="prontuario-section">
                          <div className="prontuario-section-header">
                            <h3>Histórico</h3>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setEditingProntuario(true)
                                setEditingHistorico(true)
                                setProntuarioObservacoes(prontuario.observacoes || '')
                                setHistoricoEdit(prontuario.historico || [])
                              }}
                              className="edit-button"
                            >
                              <Edit2 size={16} />
                              Editar Histórico
                            </motion.button>
                          </div>
                          <div className="historico-list">
                            {prontuario.historico.map((item, index) => (
                              <div key={index} className="historico-item">
                                <div className="historico-header">
                                  <span className="historico-profissional">{item.profissional}</span>
                                  <span className="historico-date">
                                    {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="historico-observacao">{item.observacao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <FileText size={48} />
                      <p>Nenhum prontuário encontrado para este paciente</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditingProntuario(true)
                          setProntuarioObservacoes('')
                        }}
                        className="create-button"
                      >
                        <Plus size={18} />
                        Criar Prontuário
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Status */}
        <AnimatePresence>
          {showStatusModal && selectedConsulta && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => {
                setShowStatusModal(false)
                setSelectedConsulta(null)
              }}
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
                    <Edit2 size={24} />
                    Atualizar Status - {selectedConsulta.nomePaciente}
                  </h2>
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setSelectedConsulta(null)
                    }}
                    className="close-button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-group">
                    <label>Status da Consulta</label>
                    <select
                      value={statusConsulta}
                      onChange={(e) => setStatusConsulta(e.target.value as Consulta['status'])}
                      className="status-select"
                    >
                      <option value="agendada">Agendada</option>
                      <option value="realizada">Consulta Finalizada</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="nao_compareceu">Não Compareceu</option>
                    </select>
                  </div>

                  <div className="status-description">
                    <p>
                      {statusConsulta === 'agendada' && 'Consulta agendada, aguardando paciente.'}
                      {statusConsulta === 'realizada' && 'Consulta realizada com sucesso.'}
                      {statusConsulta === 'cancelada' && 'Consulta cancelada.'}
                      {statusConsulta === 'nao_compareceu' && 'Paciente não compareceu à consulta.'}
                    </p>
                  </div>
                </div>

                <div className="modal-actions">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowStatusModal(false)
                      setSelectedConsulta(null)
                    }}
                    className="cancel-button"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateStatus}
                    className="save-button"
                  >
                    <Save size={18} />
                    Salvar
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <button onClick={resetEditForm} className="close-button">
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
                        value={editFormData.dataConsulta}
                        onChange={(e) => setEditFormData({ ...editFormData, dataConsulta: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Hora *</label>
                      <input
                        type="time"
                        value={editFormData.horaConsulta}
                        onChange={(e) => setEditFormData({ ...editFormData, horaConsulta: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as Consulta['status'] })}
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
                      value={editFormData.observacoes}
                      onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetEditForm}
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
                      <Save size={18} />
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
          {showConsultaModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowConsultaModal(false)}
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
                  <button onClick={() => setShowConsultaModal(false)} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateConsulta} className="modal-body">
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
                        value={consultaFormData.idPaciente && !showPacientesList 
                          ? pacientes.find(p => p.id === consultaFormData.idPaciente)?.nome || ''
                          : searchPaciente}
                        onChange={(e) => {
                          const value = e.target.value
                          setSearchPaciente(value)
                          setShowPacientesList(true)
                          if (!value) {
                            setConsultaFormData({ ...consultaFormData, idPaciente: '', nomePaciente: '' })
                          }
                        }}
                        onFocus={() => {
                          setShowPacientesList(true)
                          // Não limpar searchPaciente para permitir que o usuário continue digitando
                        }}
                        readOnly={!!consultaFormData.idPaciente && !showPacientesList}
                        required={!consultaFormData.idPaciente}
                        className="search-input"
                      />
                      {consultaFormData.idPaciente && !showPacientesList && (
                        <button
                          type="button"
                          onClick={() => {
                            setConsultaFormData({ ...consultaFormData, idPaciente: '', nomePaciente: '' })
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
                      className="action-button new-patient-button"
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
                          pacientesFiltrados.map(paciente => (
                            <motion.button
                              key={paciente.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setConsultaFormData({ 
                                  ...consultaFormData, 
                                  idPaciente: paciente.id,
                                  nomePaciente: paciente.nome || ''
                                })
                                setSearchPaciente('')
                                setShowPacientesList(false)
                              }}
                              className={`select-item ${consultaFormData.idPaciente === paciente.id ? 'selected' : ''}`}
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
                  <div className="form-group">
                    <label>Data *</label>
                    <input
                      type="date"
                      value={consultaFormData.dataConsulta}
                      onChange={(e) => {
                        const dataSelecionada = e.target.value
                        setConsultaFormData({ ...consultaFormData, dataConsulta: dataSelecionada, horaConsulta: '' })
                        loadHorariosDisponiveis(dataSelecionada)
                      }}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora *</label>
                    {consultaFormData.dataConsulta ? (
                      horariosDisponiveis.length > 0 ? (
                        <select
                          value={consultaFormData.horaConsulta}
                          onChange={(e) => setConsultaFormData({ ...consultaFormData, horaConsulta: e.target.value })}
                          required
                          className="form-input"
                        >
                          <option value="">Selecione um horário</option>
                          {horariosDisponiveis.map(hora => {
                            const isOcupado = horariosOcupados.includes(hora)
                            return (
                              <option 
                                key={hora} 
                                value={hora}
                                disabled={isOcupado}
                                style={isOcupado ? { 
                                  color: '#ef4444', 
                                  opacity: 0.5,
                                  fontStyle: 'italic',
                                  backgroundColor: '#fee2e2',
                                  textDecoration: 'line-through'
                                } : {}}
                              >
                                {hora}
                              </option>
                            )
                          })}
                        </select>
                      ) : (
                        <div>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Nenhum horário disponível para esta data. Adicione horários disponíveis primeiro.
                          </p>
                          <input
                            type="time"
                            value={consultaFormData.horaConsulta}
                            onChange={(e) => setConsultaFormData({ ...consultaFormData, horaConsulta: e.target.value })}
                            disabled
                            className="form-input"
                            style={{ opacity: 0.5 }}
                          />
                        </div>
                      )
                    ) : (
                      <input
                        type="time"
                        value={consultaFormData.horaConsulta}
                        onChange={(e) => setConsultaFormData({ ...consultaFormData, horaConsulta: e.target.value })}
                        disabled
                        className="form-input"
                        style={{ opacity: 0.5 }}
                        placeholder="Selecione uma data primeiro"
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={consultaFormData.status}
                      onChange={(e) => setConsultaFormData({ ...consultaFormData, status: e.target.value as Consulta['status'] })}
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
                      value={consultaFormData.observacoes}
                      onChange={(e) => setConsultaFormData({ ...consultaFormData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowConsultaModal(false)}
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
                      <Save size={18} />
                      Criar Consulta
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Criar Paciente (Profissional) */}
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
                        value={(newPaciente as any).data_nascimento} 
                        onChange={(e) => setNewPaciente({ ...newPaciente, data_nascimento: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label>CPF</label>
                      <input 
                        type="text" 
                        value={(newPaciente as any).cpf} 
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
                      value={(newPaciente as any).endereco} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, endereco: e.target.value })}
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>
                  <div className="form-group">
                    <label>Plano de Saúde</label>
                    <input 
                      type="text" 
                      value={(newPaciente as any).plano} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, plano: e.target.value })}
                      placeholder="Ex: Unimed, Bradesco Saúde, etc."
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowCreatePacienteModal(false); setNewPaciente({ nome: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' }) }} className="cancel-button">Cancelar</motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="save-button" disabled={createPacienteLoading} onClick={async () => {
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
                        data_nascimento: (newPaciente as any).data_nascimento || '',
                        telefone: newPaciente.telefone || '',
                        cpf: (newPaciente as any).cpf || '',
                        endereco: (newPaciente as any).endereco || '',
                        plano: (newPaciente as any).plano || '',
                        perfil: 'paciente',
                        idClinica: null,
                        created_at: Timestamp.now(),
                        dataCriacao: Timestamp.now(),
                      }
                      
                      const docRef = await addDoc(pacientesRef, payload)
                      const pacienteId = docRef.id
                      
                      const createdPaciente = {
                        id: pacienteId,
                        nome,
                        telefone: newPaciente.telefone || '',
                        data_nascimento: (newPaciente as any).data_nascimento || '',
                        cpf: (newPaciente as any).cpf || '',
                        endereco: (newPaciente as any).endereco || '',
                        plano: (newPaciente as any).plano || '',
                      }
                      
                      setPacientes(prev => [createdPaciente, ...prev])
                      
                      // Atualizar o formulário que está aberto (consulta ou prontuário)
                      if (showConsultaModal) {
                        setConsultaFormData({ ...consultaFormData, idPaciente: pacienteId, nomePaciente: nome })
                      }
                      if (showProntuarioCreateModal) {
                        setProntuarioFormData({ ...prontuarioFormData, idPaciente: pacienteId, nomePaciente: nome })
                      }
                      
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
                  }}> {createPacienteLoading ? 'Criando...' : 'Criar paciente'}</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Criar Prontuário */}
        <AnimatePresence>
          {showProntuarioCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowProntuarioCreateModal(false)}
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
                    Novo Prontuário
                  </h2>
                  <button onClick={() => setShowProntuarioCreateModal(false)} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateProntuario} className="prontuario-form">
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
                        value={prontuarioFormData.idPaciente && !showPacientesList 
                          ? pacientes.find(p => p.id === prontuarioFormData.idPaciente)?.nome || ''
                          : searchPaciente}
                        onChange={(e) => {
                          setSearchPaciente(e.target.value)
                          setShowPacientesList(true)
                          if (!e.target.value) {
                            setProntuarioFormData({ ...prontuarioFormData, idPaciente: '', nomePaciente: '' })
                          }
                        }}
                        onFocus={() => {
                          setShowPacientesList(true)
                          setSearchPaciente('')
                        }}
                        readOnly={!!prontuarioFormData.idPaciente && !showPacientesList}
                        required={!prontuarioFormData.idPaciente}
                        className="search-input"
                      />
                      {prontuarioFormData.idPaciente && !showPacientesList && (
                        <button
                          type="button"
                          onClick={() => {
                            setProntuarioFormData({ ...prontuarioFormData, idPaciente: '', nomePaciente: '' })
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
                      className="action-button new-patient-button"
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
                                setProntuarioFormData({ 
                                  ...prontuarioFormData, 
                                  idPaciente: paciente.id,
                                  nomePaciente: paciente.nome || ''
                                })
                                setSearchPaciente('')
                                setShowPacientesList(false)
                              }}
                              className={`select-item ${prontuarioFormData.idPaciente === paciente.id ? 'selected' : ''}`}
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
                  {/* Campos do prontuário (baseado no template Django) */}
                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      Título
                    </label>
                    <input
                      type="text"
                      value={prontuarioFormData.titulo}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, titulo: e.target.value })}
                      placeholder="Título do prontuário / resumo"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      Conteúdo
                    </label>
                    <textarea
                      value={prontuarioFormData.conteudo}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, conteudo: e.target.value })}
                      rows={4}
                      placeholder="Descrição detalhada / conteúdo do atendimento"
                    />
                  </div>

                  <div className="form-group">
                    <label>Anamnese</label>
                    <textarea
                      value={prontuarioFormData.anamnese}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, anamnese: e.target.value })}
                      rows={3}
                      placeholder="Anamnese"
                    />
                  </div>

                  <div className="form-group">
                    <label>Exame Físico</label>
                    <textarea
                      value={prontuarioFormData.exame_fisico}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, exame_fisico: e.target.value })}
                      rows={3}
                      placeholder="Exame físico"
                    />
                  </div>

                  <div className="form-group">
                    <label>Sinais Vitais</label>
                    <input
                      type="text"
                      value={prontuarioFormData.sinais_vitais}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, sinais_vitais: e.target.value })}
                      placeholder="PA, FC, FR, temperatura, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label>Diagnósticos</label>
                    <textarea
                      value={prontuarioFormData.diagnosticos}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, diagnosticos: e.target.value })}
                      rows={2}
                      placeholder="Diagnósticos"
                    />
                  </div>

                  <div className="form-group">
                    <label>Prescrições</label>
                    <textarea
                      value={prontuarioFormData.prescricoes}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, prescricoes: e.target.value })}
                      rows={2}
                      placeholder="Prescrições / orientações medicamentosas"
                    />
                  </div>

                  <div className="form-group">
                    <label>Medicamentos</label>
                    <input
                      type="text"
                      value={prontuarioFormData.medicamentos}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, medicamentos: e.target.value })}
                      placeholder="Medicamentos (nome, dose)"
                    />
                  </div>

                  <div className="form-group">
                    <label>Alergias</label>
                    <input
                      type="text"
                      value={prontuarioFormData.alergias}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, alergias: e.target.value })}
                      placeholder="Alergias"
                    />
                  </div>

                  <div className="form-group">
                    <label>Antecedentes</label>
                    <textarea
                      value={prontuarioFormData.antecedentes}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, antecedentes: e.target.value })}
                      rows={2}
                      placeholder="Antecedentes"
                    />
                  </div>

                  <div className="form-group">
                    <label>Exames Solicitados</label>
                    <textarea
                      value={prontuarioFormData.exames_solicitados}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, exames_solicitados: e.target.value })}
                      rows={2}
                      placeholder="Exames solicitados"
                    />
                  </div>

                  <div className="form-group">
                    <label>Plano / Orientações</label>
                    <textarea
                      value={prontuarioFormData.plano}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, plano: e.target.value })}
                      rows={2}
                      placeholder="Plano / orientações ao paciente"
                    />
                  </div>

                  <div className="form-group">
                    <label>Follow-up / Retorno</label>
                    <input
                      type="text"
                      value={prontuarioFormData.follow_up}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, follow_up: e.target.value })}
                      placeholder="Data ou instruções de follow-up"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <FileText size={18} />
                      Observações
                    </label>
                    <textarea
                      value={prontuarioFormData.observacoes}
                      onChange={(e) => setProntuarioFormData({ ...prontuarioFormData, observacoes: e.target.value })}
                      rows={6}
                      placeholder="Digite as observações do prontuário..."
                    />
                  </div>
                  <div className="modal-actions">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowProntuarioCreateModal(false)}
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
                      <Save size={18} />
                      Criar Prontuário
                    </motion.button>
                  </div>
                </form>
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
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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

        .header-actions {
          display: flex;
          gap: 0.75rem;
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

        .action-button.new-patient-button {
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

        .action-button.new-patient-button:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .quick-actions-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .quick-actions-section h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 1rem;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .quick-action-card {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .quick-action-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .quick-action-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .quick-action-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-primary-medico);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-wrapper .search-icon {
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

        .search-wrapper input[readonly] {
          cursor: pointer;
          background: rgba(139, 92, 246, 0.05);
        }

        .search-wrapper .search-input:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
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
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 0.25rem;
          transition: all 0.2s;
          z-index: 2;
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

        .selected-item {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 0.25rem;
          font-size: 0.875rem;
          color: var(--color-text);
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

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .filter-tab {
          padding: 0.5rem 1rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text-muted);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab.active {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
          border-color: transparent;
        }

        .filter-tab:hover:not(.active) {
          background: var(--color-surface-elevated);
          color: var(--color-text);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content h3 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .stat-content p {
          color: var(--color-text-muted);
          font-size: 0.875rem;
          margin: 0;
        }

        .section-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .consultas-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .consulta-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          transition: all 0.2s;
        }

        .consulta-item:hover {
          background: var(--color-surface-elevated);
          transform: translateX(4px);
        }

        .consulta-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-primary-medico);
          font-weight: 600;
          font-size: 0.875rem;
          min-width: 100px;
        }

        .consulta-info {
          flex: 1;
        }

        .consulta-info h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .consulta-info p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 0.5rem 0;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
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
        }

        .action-btn {
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

        .prontuario-btn {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .prontuario-btn:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .status-btn {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .status-btn:hover {
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
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .prontuario-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .prontuario-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .prontuario-section h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .prontuario-section p {
          color: var(--color-text-muted);
          line-height: 1.6;
          margin: 0;
        }

        .edit-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-primary-medico);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-button:hover {
          background: rgba(139, 92, 246, 0.2);
        }

        .prontuario-edit {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .prontuario-edit .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .prontuario-edit label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label-hint {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--color-text-muted);
          font-style: italic;
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

        .prontuario-textarea {
          width: 100%;
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s;
        }

        .prontuario-textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .create-button {
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
          margin-top: 1rem;
        }

        .create-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .prontuario-edit-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .toggle-historico-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-historico-button:hover {
          background: rgba(59, 130, 246, 0.2);
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
          width: 28px;
          height: 28px;
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

        .historico-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .historico-item {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .historico-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .historico-profissional {
          font-weight: 600;
          color: var(--color-text);
        }

        .historico-date {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .historico-observacao {
          color: var(--color-text-muted);
          line-height: 1.6;
          margin: 0;
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

        .status-select {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .status-select:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .status-description {
          padding: 1rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
        }

        .status-description p {
          color: var(--color-text-muted);
          margin: 0;
          font-size: 0.875rem;
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
          padding: 1.5rem 1rem;
        }

        .empty-state p {
          font-size: 0.95rem;
          color: var(--color-text);
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .empty-state span {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
        }

        .prontuario-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-height: 80vh;
          overflow-y: auto;
        }

        .prontuario-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
        }

        .prontuario-form .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .prontuario-form .form-group input,
        .prontuario-form .form-group textarea {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .prontuario-form .form-group input:focus,
        .prontuario-form .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .prontuario-form .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .prontuario-form .search-wrapper .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .prontuario-form .search-wrapper .search-input {
          padding-left: 3rem;
          width: 100%;
        }

        .prontuario-form .search-wrapper input[readonly] {
          cursor: pointer;
          background: rgba(139, 92, 246, 0.05);
        }

        .prontuario-form .edit-selection {
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

        .prontuario-form .edit-selection:hover {
          background: rgba(139, 92, 246, 0.2);
          color: var(--color-primary-medico);
        }

        .prontuario-form .select-list {
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

        .prontuario-form .select-item {
          padding: 0.875rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .prontuario-form .select-item:hover {
          background: var(--color-surface-elevated);
          border-color: var(--color-primary-medico);
        }

        .prontuario-form .select-item.selected {
          background: rgba(139, 92, 246, 0.1);
          border-color: var(--color-primary-medico);
        }

        .prontuario-form .select-item .name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .prontuario-form .select-item .email {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .prontuario-form .select-item .telefone {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0.25rem 0 0 0;
        }

        .prontuario-form .form-group .empty-state {
          padding: 1.5rem 1rem;
          text-align: center;
          position: static;
        }

        .prontuario-form .form-group .empty-state p {
          font-size: 0.95rem;
          color: var(--color-text);
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .prontuario-form .form-group .empty-state span {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .prontuario-form .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
          margin-top: 1rem;
        }

        .prontuario-form .cancel-button {
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

        .prontuario-form .cancel-button:hover {
          background: var(--color-surface);
        }

        .prontuario-form .save-button {
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

        .prontuario-form .save-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .prontuario-form .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </Layout>
  )
}
