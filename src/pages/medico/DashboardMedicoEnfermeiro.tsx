import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/config'
import { Consulta } from '@/types'
import { exportToCSV, exportToExcel, exportToJSON, prepareConsultasForExport, prepareProntuariosForExport } from '@/utils/exportUtils'
import { format, isSameDay } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle, Clock, Edit2, FileJson, FileSpreadsheet, FileText, Plus, Save, Stethoscope, Trash2, User, UserCheck, X, XCircle } from 'lucide-react'
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

export default function DashboardMedicoEnfermeiro() {
  const { userProfile } = useAuth()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [allConsultas, setAllConsultas] = useState<Consulta[]>([]) // Todas as consultas (sem filtro de data)
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [showProntuarioModal, setShowProntuarioModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [prontuario, setProntuario] = useState<Prontuario | null>(null)
  const [loadingProntuario, setLoadingProntuario] = useState(false)
  const [statusConsulta, setStatusConsulta] = useState<Consulta['status']>('confirmada')
  const [editingProntuario, setEditingProntuario] = useState(false)
  const [editingHistorico, setEditingHistorico] = useState(false)
  const [prontuarioObservacoes, setProntuarioObservacoes] = useState('')
  const [historicoEdit, setHistoricoEdit] = useState<Array<{ data: Date | any, profissional: string, observacao: string }>>([])

  useEffect(() => {
    if (userProfile) {
      loadConsultas()
      loadProntuarios()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  const loadConsultas = async () => {
    // Permitir também profissionais vinculados a clínica cujo perfil é 'profissional' e possuem idClinica
    const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
    if (!userProfile || (!(userProfile.perfil === 'medico' || isClinicProfessional))) return

    setLoading(true)
    try {
      // LOGS DE DEBUG INICIAIS
      console.log('==== DEBUG CONSULTAS MÉDICO ====' )
      console.log('userProfile:', userProfile)
      console.log('userProfile.id:', userProfile.id)
      console.log('userProfile.idClinica:', (userProfile as any).idClinica)

      // Escolher coleção correta: profissionais autônomos -> 'consultas_autonomos', médicos de clínica -> 'consultas_clinicas'
      // Usar `idClinica` como critério (mais confiável que `perfil`)
      const collectionName = 'consultas_clinicas'
      console.log('collectionName:', collectionName)
      const consultasRef = collection(db, collectionName)
      
       // Buscar TODAS as consultas da clínica primeiro (não filtrar por profissional na query)
    const consultasQuery = query(
      consultasRef,
      where('id_clinica', '==', (userProfile as any).idClinica)
    )
    
    const consultasSnap = await getDocs(consultasQuery)
    console.log('📋 Total de consultas encontradas na clínica:', consultasSnap.docs.length)

    let consultasData = consultasSnap.docs
      .map(doc => {
        const data = doc.data()
        console.log(`Consulta[${doc.id}]:`, data)
        
        const rawDataConsulta = data.data_consulta || data.dataConsulta
        const parsedDataConsulta = typeof rawDataConsulta === 'string' 
          ? new Date(rawDataConsulta.replace(' ', 'T')) 
          : (rawDataConsulta?.toDate?.() || new Date())
        
        const rawCreated = data.created_at || data.dataCriacao
        const parsedCreated = rawCreated?.toDate?.() || (typeof rawCreated === 'string' ? new Date(rawCreated) : new Date())
        
        // Verificar ambos os campos possíveis para idProfissional
        const idProfissional = data.id_profissional || data.idProfissional || ''
        const nomeProfissional = data.nm_profissional || data.nomeProfissional || ''
        
        return {
          id: doc.id,
          idPaciente: data.id_paciente || data.idPaciente || '',
          nomePaciente: data.nm_paciente || data.nomePaciente || '',
          idProfissional: idProfissional,
          nomeProfissional: nomeProfissional,
          dataConsulta: parsedDataConsulta,
          dataCriacao: parsedCreated,
          status: String(data.status || '').toLowerCase(),
          observacoes: data.obs || data.observacoes || '',
          sourceCollection: collectionName,
        } as Consulta
      })
      // Filtrar para mostrar apenas consultas do médico logado ou todos da clínica para recepção/clinica
        .filter(c => {
          const isDoctor = userProfile.perfil === 'medico'
          const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
          const perfilStr = (userProfile as any).perfil
          const showClinicPatients = perfilStr === 'clinica' || perfilStr === 'recepcionista' || isClinicProfessional

          const pertence = c.idProfissional === userProfile.id
          console.log(`Consulta ${c.id} - Paciente: ${c.nomePaciente} - Pertence: ${pertence} (Profissional: ${c.idProfissional}, Médico Logado: ${userProfile.id})`)

          // Médicos (perfil 'medico') veem apenas suas consultas; clinica/recepção veem todas da clínica
          if (showClinicPatients && !isDoctor) return true
          return pertence
        })
    
    console.log('✅ Consultas após filtro de idProfissional:', consultasData.length)
    
    // Filtrar apenas consultas de hoje — incluir agendadas/confirmadas/realizadas
    consultasData = consultasData.filter(c => {
      const dataConsulta = new Date(c.dataConsulta)
      const isHoje = isSameDay(dataConsulta, new Date())
      const statusOk = ['agendada', 'confirmada', 'realizada'].includes(String(c.status || '').toLowerCase())

      return isHoje && statusOk
    })

    console.log('✅ Consultas finais que serão exibidas (hoje + status):', consultasData.length)

    // Marcar automaticamente como realizada consultas passadas que ainda estão agendadas ou confirmadas
    const agora = new Date()
    const consultasParaAtualizar: { id: string, collection: string }[] = []
    
    consultasData.forEach(c => {
      const dataConsulta = new Date(c.dataConsulta)
      const statusLower = String(c.status || '').toLowerCase()
      if (dataConsulta < agora && (statusLower === 'agendada' || statusLower === 'confirmada')) {
        const targetCollection = (c as any).sourceCollection || (((userProfile as any).idClinica) ? 'consultas_clinicas' : 'consultas_autonomos')
        consultasParaAtualizar.push({ id: c.id, collection: targetCollection })
      }
    })

    // Atualizar consultas passadas
    if (consultasParaAtualizar.length > 0) {
      await Promise.all(consultasParaAtualizar.map(async ({ id, collection }) => {
        try {
          const statusToSave = (collection === 'consultas_autonomos' || collection === 'consultas_clinicas')
            ? 'Realizada'
            : 'realizada'
          await updateDoc(doc(db, collection, id), {
            status: statusToSave,
          })
        } catch (error) {
          console.error(`Erro ao atualizar consulta ${id}:`, error)
        }
      }))
      // Recarregar consultas após atualização
      const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
      let targetCollection = 'consultas_autonomos'
      if (
        userProfile && (
          userProfile.perfil === 'clinica' ||
          userProfile.perfil === 'recepcionista' ||
          userProfile.perfil === 'medico' ||
          isClinicProfessional
        )
      ) {
        targetCollection = 'consultas_clinicas'
      }
      const consultasRef2 = collection(db, targetCollection)
      const consultasQuery2 = query(consultasRef2)
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
          sourceCollection: targetCollection,
          _raw: data,
        } as Consulta
      }) as Consulta[]

      // Reaplicar filtros
      consultasData = consultasData
        .filter(c => {
          const isDoctor = userProfile.perfil === 'medico'
          const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
          const perfilStr = (userProfile as any).perfil
          const showClinicPatients = perfilStr === 'clinica' || perfilStr === 'recepcionista' || isClinicProfessional

          const pertence = c.idProfissional === userProfile.id
          if (showClinicPatients && !isDoctor) return true
          return pertence
        })
        .filter(c => {
          const dataConsulta = new Date(c.dataConsulta)
          const isHoje = isSameDay(dataConsulta, new Date())
          const statusOk = ['agendada', 'confirmada', 'realizada'].includes(String(c.status || '').toLowerCase())
          return isHoje && statusOk
        })
    }

    // Salvar todas as consultas (sem filtro de data)
    setAllConsultas(consultasData)

    // Ordenar por hora
    consultasData.sort((a, b) => 
      new Date(a.dataConsulta).getTime() - new Date(b.dataConsulta).getTime()
    )

    setConsultas(consultasData)
  } catch (error) {
    console.error('Erro ao carregar consultas:', error)
    toast.error('Erro ao carregar consultas')
  } finally {
    setLoading(false)
  }
}

  const loadProntuario = async (idPaciente: string) => {
    if (!userProfile) return

    setLoadingProntuario(true)
    try {
      // Buscar prontuário do paciente do profissional ou da própria clínica
      const prontuariosRef = collection(db, 'prontuarios')
      const queries = [] as any[]
      queries.push(query(prontuariosRef, where('idPaciente', '==', idPaciente), where('idProfissional', '==', userProfile.id)))

      const perfilStr = (userProfile as any).perfil
      const isClinicMember = perfilStr === 'clinica' || perfilStr === 'recepcionista' || ((userProfile as any).idClinica)
      if (isClinicMember && (userProfile as any).idClinica) {
        queries.push(query(prontuariosRef, where('idPaciente', '==', idPaciente), where('idClinica', '==', (userProfile as any).idClinica)))
      }

      const resultsDocs: Record<string, any> = {}
      for (const q of queries) {
        try {
          const snap = await getDocs(q)
          snap.docs.forEach(d => { resultsDocs[d.id] = d })
        } catch (e) {
          console.warn('Erro ao executar query de prontuário', e)
        }
      }

      const docs = Object.values(resultsDocs)
      console.log('🔍 Buscando prontuário:', { idPaciente, medicoLogado: userProfile.id, medicoNome: userProfile.nome, totalEncontrados: docs.length })

      if (docs.length > 0) {
        const prontuarioDoc = docs[0]
        const data = prontuarioDoc.data()

        // Permitir prontuários da clínica ou do profissional
        if (data.idProfissional && data.idProfissional !== userProfile.id && !(data.idClinica && (userProfile as any).idClinica && data.idClinica === (userProfile as any).idClinica)) {
          console.warn('⚠️ Prontuário não pertence ao perfil atual - REJEITADO')
          setProntuario(null)
          toast.error('Este prontuário não pertence ao seu perfil')
          return
        }

        console.log('✅ Prontuário carregado com sucesso:', userProfile.nome)
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
        setProntuarioObservacoes('')
        setHistoricoEdit(prontuarioData.historico || [])
      } else {
        console.log('ℹ️ Nenhum prontuário encontrado para este paciente e perfil')
        setProntuario(null)
        setProntuarioObservacoes('')
        setHistoricoEdit([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar prontuário:', error)
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
    // Limpar campo de observações para permitir adicionar nova observação
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
        // O campo de observações é sempre tratado como uma NOVA observação
        if (observacoes.trim()) {
          historicoParaSalvar.push({
            data: Timestamp.now(),
            profissional: userProfile.nome,
            observacao: observacoes.trim(),
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
          idClinica: (userProfile as any).idClinica || null,
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
      const targetCollection = (selectedConsulta as any).sourceCollection || (((userProfile as any).idClinica) ? 'consultas_clinicas' : 'consultas_autonomos')
      const statusToSave = (targetCollection === 'consultas_autonomos' || targetCollection === 'consultas_clinicas')
        ? (String(statusConsulta || '').charAt(0).toUpperCase() + String(statusConsulta || '').slice(1))
        : statusConsulta
      await updateDoc(doc(db, targetCollection, selectedConsulta.id), {
        status: statusToSave,
      })
      await loadConsultas()
      setShowStatusModal(false)
      setSelectedConsulta(null)
      toast.success('Status da consulta atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da consulta')
    }
  }

  // Permite alterar status diretamente (Confirmar, Cancelar, Realizada)
  const handleStatusChange = async (consulta: Consulta, novoStatus: Consulta['status']) => {
    if (!consulta) return

    // Confirmar antes de cancelar
    if (novoStatus === 'cancelada') {
      const confirmed = window.confirm(`Tem certeza que deseja cancelar a consulta de ${consulta.nomePaciente}?`)
      if (!confirmed) return
    }

    try {
      const targetCollection = (consulta as any).sourceCollection || (((userProfile as any).idClinica) ? 'consultas_clinicas' : 'consultas_autonomos')
      const statusToSave = (targetCollection === 'consultas_autonomos' || targetCollection === 'consultas_clinicas')
        ? (String(novoStatus || '').charAt(0).toUpperCase() + String(novoStatus || '').slice(1))
        : novoStatus
      await updateDoc(doc(db, targetCollection, consulta.id), {
        status: statusToSave,
      })
      await loadConsultas()
      toast.success('Status da consulta atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da consulta')
    }
  }

  const canEditStatusLocal = (consulta: Consulta) => {
    if (!userProfile) return false
    if (userProfile.perfil === 'clinica') return true
    if (userProfile.perfil === 'recepcionista') return true
    if (userProfile.perfil === 'profissional') {
      const isClinicProfessional = (userProfile as any).idClinica
      const isAssigned = consulta.idProfissional === userProfile.id
      if (!isAssigned) return false
      if (isClinicProfessional) return true
      return consulta.status === 'agendada'
    }
    return false
  }

  const loadProntuarios = async () => {
    if (!userProfile || userProfile.perfil !== 'medico') return

    try {
      const prontuariosRef = collection(db, 'prontuarios')

      const queries = [] as any[]
      // Sempre tentar buscar prontuários atribuídos diretamente ao profissional
      queries.push(query(prontuariosRef, where('idProfissional', '==', userProfile.id)))

      // Se o usuário pertence a uma clínica (clínica ou profissional com idClinica), buscar também por idClinica
      const perfilStr = (userProfile as any).perfil
      const isClinicMember = perfilStr === 'clinica' || perfilStr === 'recepcionista' || ((userProfile as any).idClinica)
      if (isClinicMember && (userProfile as any).idClinica) {
        queries.push(query(prontuariosRef, where('idClinica', '==', (userProfile as any).idClinica)))
      }

      const resultsDocs: Record<string, any> = {}
      for (const q of queries) {
        try {
          const snap = await getDocs(q)
          snap.docs.forEach(d => { resultsDocs[d.id] = d })
        } catch (e) {
          console.warn('Erro ao executar query de prontuários', e)
        }
      }

      const prontuariosData = Object.values(resultsDocs).map((d: any) => {
        const data = d.data()
        return {
          id: d.id,
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

  const getStatusLabel = (status: Consulta['status']) => {
    switch (status) {
      case 'agendada':
        return 'Agendada'
      case 'confirmada':
        return 'Paciente Chegou'
      case 'realizada':
        return 'Consulta Finalizada'
      case 'nao_compareceu':
        return 'Não compareceu'
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

  if (loading) {
    return (
      <Layout currentProfile="medico">
        <div className="loading-state">Carregando...</div>
      </Layout>
    )
  }

  const perfilNome = 'Médico'

  return (
    <Layout currentProfile="medico">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-content"
      >
        <div className="dashboard-header">
          <div>
            <h1>Dashboard {perfilNome}</h1>
            <p>Pacientes do dia - {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
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
                <Calendar size={24} color="#8b5cf6" />
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


        {/* Cards de Estatísticas */}
        <div className="stats-grid">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Stethoscope size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultas.length}</h3>
              <p>Pacientes Hoje</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <FileText size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultas.filter(c => c.status === 'realizada').length}</h3>
              <p>Atendidos</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Calendar size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{consultas.filter(c => c.status === 'confirmada').length}</h3>
              <p>Pendentes</p>
            </div>
          </motion.div>
        </div>

        {/* Lista de Pacientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="section-card"
        >
          <h2>
            <User size={20} />
            Lista de Pacientes
          </h2>
          <div className="pacientes-list">
            {consultas.map((consulta, index) => (
              <motion.div
                key={consulta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="paciente-item"
              >
                <div className="paciente-time">
                  <Calendar size={16} />
                  <span>{format(new Date(consulta.dataConsulta), "HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="paciente-info">
                  <h4>{consulta.nomePaciente}</h4>
                  <div className="paciente-status">
                    <span className={`status-badge status-${consulta.status}`}>
                      {getStatusIcon(consulta.status)}
                      {getStatusLabel(consulta.status)}
                    </span>
                  </div>
                </div>
                <div className="paciente-actions">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenProntuario(consulta)}
                    className="action-btn prontuario-btn"
                  >
                    <FileText size={18} />
                    Prontuário
                  </motion.button>

                  {/* Ações rápidas: Cancelar / Marcar como Realizada */}
                  {canEditStatusLocal(consulta) && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {consulta.status !== 'cancelada' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusChange(consulta, 'cancelada')}
                          className="action-btn cancel-btn"
                        >
                          <X size={16} />
                          Cancelar
                        </motion.button>
                      )}

                      {consulta.status !== 'realizada' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusChange(consulta, 'nao_compareceu')}
                            className="action-btn absent-btn"
                          >
                            <XCircle size={16} />
                            Não compareceu
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusChange(consulta, 'realizada')}
                            className="action-btn done-btn"
                          >
                            <CheckCircle size={16} />
                            Realizada
                          </motion.button>
                        </>
                      )}
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenStatusModal(consulta)}
                    className="action-btn status-btn"
                  >
                    <Edit2 size={18} />
                    Status
                  </motion.button>
                </div>
              </motion.div>
            ))}
            {consultas.length === 0 && (
              <p className="empty-state">Nenhum paciente agendado para hoje</p>
            )}
          </div>
        </motion.div>

        {/* Modal de Prontuário */}
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
                              // Carregar histórico atual quando abrir o editor
                              if (prontuario) {
                                setHistoricoEdit(prontuario.historico || [])
                              } else {
                                // Se não tem prontuário, começar com histórico vazio ou com a observação atual
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
                      <option value="confirmada">Paciente Chegou</option>
                      <option value="realizada">Consulta Finalizada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div className="status-description">
                    <p>
                      {statusConsulta === 'agendada' && 'Consulta agendada, aguardando paciente.'}
                      {statusConsulta === 'confirmada' && 'Paciente chegou e está aguardando atendimento.'}
                      {statusConsulta === 'realizada' && 'Consulta realizada com sucesso.'}
                      {statusConsulta === 'cancelada' && 'Consulta cancelada.'}
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

        .section-card h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pacientes-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .paciente-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          transition: all 0.2s;
        }

        .paciente-item:hover {
          background: var(--color-surface-elevated);
          transform: translateX(4px);
        }

        .paciente-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-primary-medico);
          font-weight: 600;
          font-size: 0.875rem;
          min-width: 100px;
        }

        .paciente-info {
          flex: 1;
        }

        .paciente-info h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .paciente-info p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .paciente-status {
          margin-top: 0.5rem;
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

        .paciente-actions {
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
          margin-bottom: 1rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
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
        }

        .save-button {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .save-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .empty-state {
          text-align: center;
          color: var(--color-text-muted);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-state p {
          margin: 0;
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

