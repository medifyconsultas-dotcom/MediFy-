import Button from '@/components/Button'
import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/config'
import { Consulta } from '@/types'
import { useConfirmDialog } from '@/utils/confirmDialog'
import { isPastDateTime } from '@/utils/validators'
import { format, parse } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, CheckCircle, Clock, Edit2, Filter, Plus, Save, Search, User, Users, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

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

export default function Consultas() {
  const { userProfile } = useAuth()
  const { confirm, DialogComponent } = useConfirmDialog()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'agendada' | 'realizada' | 'cancelada' | 'nao_compareceu'>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [funcionarios, setFuncionarios] = useState<Profissional[]>([])
  const [filterFuncionario, setFilterFuncionario] = useState<string>('')
  // Removido: selectedConsulta/setSelectedConsulta não utilizados
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
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
  const [searchPaciente, setSearchPaciente] = useState('')
  const [searchProfissional, setSearchProfissional] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [showProfissionaisList, setShowProfissionaisList] = useState(false)
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
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])

  useEffect(() => {
    if (userProfile) {
      loadConsultas()
      loadPacientesAndProfissionais()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, filter, filterFuncionario]) // Recarrega quando entrar na página

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userProfile) {
        loadConsultas()
      }
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  useEffect(() => {
    // Só adiciona listener se as listas estiverem visíveis
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

  const loadPacientesAndProfissionais = async () => {
    if (!userProfile) return

    try {
      // Carregar pacientes baseado no perfil
      if (userProfile.perfil === 'clinica') {
        // Clínica: mostrar apenas pacientes que já tiveram consultas com a clínica
        const consultasRef = collection(db, 'consultas_clinicas')
        const consultasQuery = query(
          consultasRef,
          where('id_clinica', '==', userProfile.id)
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
      } else if (userProfile.perfil === 'profissional') {
        // Profissional autônomo: buscar apenas pacientes que já tiveram consultas com ele
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
      } else if (userProfile.perfil === 'recepcionista' || userProfile.perfil === 'medico') {
        // Recepcionista/Médico: mostrar apenas pacientes que já tiveram consultas com a clínica
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
        } else {
          // Se não tiver idClinica, não mostrar pacientes
          setPacientes([])
        }
      } else {
        // Outros perfis: não mostrar pacientes
        setPacientes([])
      }

      // Carregar profissionais baseado no perfil
      if (userProfile.perfil === 'clinica') {
        const profissionaisRef = collection(db, 'profissionais')
        const profissionaisQuery = query(profissionaisRef, where('idClinica', '==', userProfile.id))
        const profissionaisSnap = await getDocs(profissionaisQuery)
        const profissionaisData = profissionaisSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Profissional[]

        // Carregar funcionários médicos
        const funcionariosRef = collection(db, 'funcionarios')
        const funcionariosQuery = query(funcionariosRef, where('idClinica', '==', userProfile.id))
        const funcionariosSnap = await getDocs(funcionariosQuery)
        const funcionariosData = funcionariosSnap.docs
          .filter(doc => doc.data().cargo === 'medico')
          .map(doc => ({
            id: doc.id,
            nome: doc.data().nome,
            especialidade: doc.data().especialidade || '',
          })) as Profissional[]

        setProfissionais([...profissionaisData, ...funcionariosData])
        setFuncionarios([...profissionaisData, ...funcionariosData])
      } else if (userProfile.perfil === 'profissional') {
        // Profissional autônomo só pode criar consultas para si mesmo
        setProfissionais([{
          id: userProfile.id,
          nome: userProfile.nome,
          especialidade: (userProfile as any).especialidade || '',
        }])
      } else if (userProfile.perfil === 'recepcionista') {
        const idClinica = (userProfile as any).idClinica
        const profissionaisRef = collection(db, 'profissionais')
        const profissionaisQuery = query(profissionaisRef, where('idClinica', '==', idClinica))
        const profissionaisSnap = await getDocs(profissionaisQuery)
        const profissionaisData = profissionaisSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Profissional[]

        const funcionariosRef = collection(db, 'funcionarios')
        const funcionariosQuery = query(funcionariosRef, where('idClinica', '==', idClinica))
        const funcionariosSnap = await getDocs(funcionariosQuery)
        const funcionariosData = funcionariosSnap.docs
          .filter(doc => doc.data().cargo === 'medico')
          .map(doc => ({
            id: doc.id,
            nome: doc.data().nome,
            especialidade: doc.data().especialidade || '',
          })) as Profissional[]

        setProfissionais([...profissionaisData, ...funcionariosData])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes e profissionais:', error)
    }
  }

  const loadConsultas = async () => {
    if (!userProfile) return

    setLoading(true)
    try {
      // Escolhe a collection dependendo do perfil/escopo:
      // - 'consultas_autonomos' para profissionais autônomos
      // - 'consultas_clinicas' para médicos, clínicas e recepção
      let collectionName = 'consultas_autonomos'
      // Profissionais que pertencem a uma clínica (perfil 'profissional' com idClinica)
      const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
      if (
        userProfile && (
          userProfile.perfil === 'clinica' ||
          userProfile.perfil === 'recepcionista' ||
          userProfile.perfil === 'medico' ||
          isClinicProfessional
        )
      ) {
        collectionName = 'consultas_clinicas'
      }
      const consultasRef = collection(db, collectionName)
      let consultasQuery

      // Filtrar consultas baseado no perfil — usar nomes de campo corretos conforme a coleção
      if (userProfile.perfil === 'clinica') {
        consultasQuery = query(
          consultasRef,
          where('id_clinica', '==', userProfile.id)
        )
      } else if (userProfile.perfil === 'profissional') {
        consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', userProfile.id)
        )
      } else if (userProfile.perfil === 'medico') {
        consultasQuery = query(
          consultasRef,
          where('id_profissional', '==', userProfile.id)
        )
      } else if (userProfile.perfil === 'recepcionista') {
        consultasQuery = query(
          consultasRef,
          where('id_clinica', '==', (userProfile as any).idClinica)
        )
      } else {
        consultasQuery = consultasRef
      }

      const consultasSnap = await getDocs(consultasQuery)
      let consultasData = consultasSnap.docs.map(doc => {
        const data = doc.data()
        if (collectionName === 'consultas_autonomos' || collectionName === 'consultas_clinicas') {
          // Mapeia os campos conforme o formato do banco enviado na imagem
          const rawDataConsulta = data.data_consulta || data.dataConsulta
          const parsedDataConsulta = typeof rawDataConsulta === 'string'
            ? new Date(rawDataConsulta.replace(' ', 'T'))
            : rawDataConsulta?.toDate?.() || new Date()

          const rawCreatedAt = data.created_at || data.dataCriacao
          const parsedCreatedAt = rawCreatedAt?.toDate?.() || (typeof rawCreatedAt === 'string' ? new Date(rawCreatedAt) : new Date())

          const rawStatus = data.status || ''
          const normalizedStatus = String(rawStatus).toLowerCase()

          return {
            id: doc.id,
            idPaciente: data.id_paciente || data.idPaciente || '',
            nomePaciente: data.nm_paciente || data.nomePaciente || '',
            idProfissional: data.id_profissional || data.idProfissional || '',
            nomeProfissional: data.nm_profissional || data.nomeProfissional || '',
            dataConsulta: parsedDataConsulta,
            dataCriacao: parsedCreatedAt,
            observacoes: data.obs || data.observacoes || '',
            status: normalizedStatus as Consulta['status'],
            sourceCollection: collectionName,
            // mantém campos originais caso precise
            _raw: data,
          }
        }

        // Default: formato atual usado na app
        return {
          id: doc.id,
          ...data,
          dataConsulta: data.dataConsulta?.toDate?.() || new Date(),
          dataCriacao: data.dataCriacao?.toDate?.() || new Date(),
          sourceCollection: collectionName,
        }
      }) as unknown as Consulta[]

      // Aplicar filtro de status
      if (filter !== 'todas') {
        consultasData = consultasData.filter(c => c.status === filter)
      }

      // Aplicar busca
      if (searchTerm) {
        consultasData = consultasData.filter(c => 
          c.nomePaciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.nomeProfissional.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Aplicar filtro por funcionário (para clínica e recepcionista)
      if ((userProfile.perfil === 'clinica' || userProfile.perfil === 'recepcionista') && filterFuncionario) {
        consultasData = consultasData.filter(c => 
          c.idProfissional === filterFuncionario ||
          c.nomeProfissional?.toLowerCase().includes(filterFuncionario.toLowerCase())
        )
      }

      // Ordenar por data
      consultasData.sort((a, b) => 
        new Date(b.dataConsulta).getTime() - new Date(a.dataConsulta).getTime()
      )

      setConsultas(consultasData)
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
      toast.error('Erro ao carregar consultas')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (consultaId: string, novoStatus: Consulta['status']) => {
    const consulta = consultas.find(c => c.id === consultaId)
    if (!consulta) return

    // Confirmar antes de cancelar
    if (novoStatus === 'cancelada') {
      const confirmed = await confirm(
        'Cancelar Consulta',
        `Tem certeza que deseja cancelar a consulta de ${consulta.nomePaciente}?`,
        {
          confirmText: 'Cancelar Consulta',
          cancelText: 'Voltar',
          variant: 'warning'
        }
      )
      if (!confirmed) return
    }

    try {
      // Sempre usar a collection correta
      let targetCollection = 'consultas_autonomos'
      const isClinicProfessional = userProfile && userProfile.perfil === 'profissional' && (userProfile as any).idClinica
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
      const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
      const statusToSave = capitalize(novoStatus)
      await updateDoc(doc(db, targetCollection, consultaId), {
        status: statusToSave,
      })
      await loadConsultas()
      toast.success('Status da consulta atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da consulta')
    }
  }

  const canEditStatus = (consulta: Consulta) => {
    if (!userProfile) return false
    // clinic admins / reception can always change status
    if (userProfile.perfil === 'clinica') return true
    if (userProfile.perfil === 'recepcionista') return true

    // profissionais: comportamento diferente para autônomos vs vinculados a clínica
    if (userProfile.perfil === 'profissional') {
      const isClinicProfessional = (userProfile as any).idClinica
      const isAssigned = consulta.idProfissional === userProfile.id
      if (!isAssigned) return false

      // Profissional vinculado a clínica pode alterar status (ex.: marcar como realizada)
      if (isClinicProfessional) return true

      // Profissional autônomo só pode alterar quando estiver 'agendada'
      return consulta.status === 'agendada'
    }

    return false
  }

  const canEdit = () => {
    if (!userProfile) return false
    if (userProfile.perfil === 'clinica') return true
    if (userProfile.perfil === 'recepcionista') return true
    return false
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


  // Buscar horários disponíveis do profissional
  const loadHorariosDisponiveis = async (profissionalId: string, dataSelecionada: string) => {
    if (!profissionalId || !dataSelecionada) {
      setHorariosDisponiveis([])
      setHorariosOcupados([])
      return
    }

    try {
      const horariosRef = collection(db, 'profissionais', profissionalId, 'horarios')
      const horariosSnap = await getDocs(horariosRef)
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const horariosDisponiveisList: string[] = []
      
      horariosSnap.docs.forEach(doc => {
        const horarioData = doc.data()
        
        // Horários recorrentes (por dia da semana)
        if (horarioData.tipo === 'recorrente' && horarioData.diaSemana !== undefined) {
          const dataObj = parse(dataSelecionada, 'yyyy-MM-dd', new Date())
          const diaSemanaData = dataObj.getDay() // 0=domingo, 1=segunda, ..., 6=sábado
          
          // Comparar dia da semana (garantir que ambos sejam números)
          const horarioDiaSemana = Number(horarioData.diaSemana)
          
          if (diaSemanaData === horarioDiaSemana && dataObj >= hoje) {
            if (horarioData.disponivel !== false && horarioData.hora) {
              horariosDisponiveisList.push(horarioData.hora)
            }
          }
        }
        
        // Horários específicos (por data)
        if (horarioData.tipo === 'especifico' && horarioData.data) {
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
        
        // Se não tem tipo definido, tratar como específico (compatibilidade com dados antigos)
        if (!horarioData.tipo && horarioData.data) {
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
      })
      
      const horariosUnicos = Array.from(new Set(horariosDisponiveisList)).sort()
      setHorariosDisponiveis(horariosUnicos)
      
      // Buscar horários ocupados
      let idProfissionalFinal = formData.idProfissional
      if (userProfile?.perfil === 'profissional') {
        idProfissionalFinal = userProfile.id
      }

      let idClinica = null
      if (userProfile?.perfil === 'clinica') {
        idClinica = userProfile.id
      } else if (userProfile?.perfil === 'recepcionista' || userProfile?.perfil === 'medico') {
        idClinica = (userProfile as any).idClinica || null
      }

      const conflitosCollectionName = idClinica === null ? 'consultas_autonomos' : 'consultas_clinicas'
      const consultasRef = collection(db, conflitosCollectionName)
      const idProfField = conflitosCollectionName === 'consultas_autonomos' ? 'id_profissional' : 'idProfissional'
      const consultasQuery = query(
        consultasRef,
        where(idProfField, '==', idProfissionalFinal)
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
          if (status === 'agendada') {
            horariosOcupadosList.push(horaConsultaStr)
          }
        }
      })
      
      setHorariosOcupados(horariosOcupadosList)
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    // Para profissional autônomo, não precisa preencher idProfissional
    const precisaProfissional = userProfile.perfil !== 'profissional'
    
    if (!formData.idPaciente || !formData.dataConsulta || !formData.horaConsulta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (precisaProfissional && !formData.idProfissional) {
      toast.error('Selecione um profissional')
      return
    }

    // Validar se a data não é no passado
    const dataSelecionada = new Date(formData.dataConsulta)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (dataSelecionada < hoje) {
      toast.error('Não é possível agendar consultas no passado')
      return
    }

    // Validar se o horário está disponível
    let idProfissionalFinal = formData.idProfissional
    if (userProfile.perfil === 'profissional') {
      idProfissionalFinal = userProfile.id
    }

    if (idProfissionalFinal && !horariosDisponiveis.includes(formData.horaConsulta)) {
      toast.error('Este horário não está disponível')
      return
    }

    // Validar se o horário não está ocupado
    if (horariosOcupados.includes(formData.horaConsulta)) {
      toast.error('Este horário já está ocupado')
      return
    }

    const dataHora = new Date(`${formData.dataConsulta}T${formData.horaConsulta}`)

    try {
      // Para profissional autônomo, usar o próprio ID
      let idProfissionalFinal = formData.idProfissional
      let nomeProfissionalFinal = formData.nomeProfissional
      
      if (userProfile.perfil === 'profissional') {
        idProfissionalFinal = userProfile.id
        nomeProfissionalFinal = userProfile.nome
      }

      const paciente = pacientes.find(p => p.id === formData.idPaciente)
      const profissional = profissionais.find(p => p.id === idProfissionalFinal)

      if (!paciente) {
        toast.error('Paciente não encontrado')
        return
      }

      if (userProfile.perfil !== 'profissional' && !profissional) {
        toast.error('Profissional não encontrado')
        return
      }

      // Determinar idClinica (null para profissionais autônomos)
      let idClinica = null
      if (userProfile.perfil === 'clinica') {
        idClinica = userProfile.id
      } else if (userProfile.perfil === 'recepcionista' || userProfile.perfil === 'medico') {
        idClinica = (userProfile as any).idClinica || null
      } else if (userProfile.perfil === 'profissional') {
        idClinica = null // Profissional autônomo não tem idClinica
      }

      // Verificar conflitos de horário na collection correta
      const conflitosCollectionName = idClinica === null ? 'consultas_autonomos' : 'consultas_clinicas'
      const consultasRefConf = collection(db, conflitosCollectionName)
      const idProfField = conflitosCollectionName === 'consultas_autonomos' ? 'id_profissional' : 'idProfissional'
      const conflitosQuery = query(
        consultasRefConf,
        where(idProfField, '==', idProfissionalFinal)
      )
      const conflitosSnap = await getDocs(conflitosQuery)
      
      const conflitos = conflitosSnap.docs
        .map(doc => {
          const data = doc.data()
          const rawStatus = data.status || ''
          const normalizedStatus = String(rawStatus).toLowerCase()
          const rawDataConsulta = data.data_consulta || data.dataConsulta
          const parsedDataConsulta = typeof rawDataConsulta === 'string'
            ? new Date(rawDataConsulta.replace(' ', 'T'))
            : rawDataConsulta?.toDate?.() || new Date()

          return {
            id: doc.id,
            status: normalizedStatus,
            dataConsulta: parsedDataConsulta,
          }
        })
        .filter(c => c.status === 'agendada')

      const conflito = conflitos.find(c => {
        const diff = Math.abs(c.dataConsulta.getTime() - dataHora.getTime())
        return diff < 30 * 60 * 1000 // 30 minutos
      })

      if (conflito) {
        toast.error('Já existe uma consulta agendada para este profissional neste horário (mínimo 30 minutos entre consultas)')
        return
      }

      const targetCollectionName = idClinica === null ? 'consultas_autonomos' : 'consultas_clinicas'

      if (targetCollectionName === 'consultas_autonomos') {
        // Salvar com os nomes de campo exatos do banco mostrado na imagem
        const docRef = await addDoc(collection(db, targetCollectionName), {
          id_paciente: formData.idPaciente,
          nm_paciente: paciente.nome,
          id_profissional: idProfissionalFinal,
          nm_profissional: nomeProfissionalFinal,
          id_clinica: idClinica,
          data_consulta: format(dataHora, "yyyy-MM-dd HH:mm"),
          status: (formData.status || '').charAt(0).toUpperCase() + (formData.status || '').slice(1),
          obs: formData.observacoes || '',
          created_at: Timestamp.now(),
          tipo_atendimento: 'autonomo',
        })
        // atualizar campo id conforme mostrado na imagem
        await updateDoc(doc(db, targetCollectionName, docRef.id), { id: docRef.id })
      } else {
        // Salvar consultas de clínica usando o esquema snake_case conforme imagem
        const docRef = await addDoc(collection(db, targetCollectionName), {
          id_paciente: formData.idPaciente,
          nm_paciente: paciente.nome,
          id_profissional: idProfissionalFinal,
          nm_profissional: nomeProfissionalFinal,
          id_clinica: idClinica,
          nm_clinica: (userProfile.perfil === 'clinica' ? (userProfile as any).nome : null),
          data_consulta: format(dataHora, "yyyy-MM-dd HH:mm"),
          status: (formData.status || '').charAt(0).toUpperCase() + (formData.status || '').slice(1),
          obs: formData.observacoes || '',
          created_at: Timestamp.now(),
          tipo_atendimento: 'clinica',
        })
        // garantir que o campo id seja gravado no documento (consistência)
        await updateDoc(doc(db, targetCollectionName, docRef.id), { id: docRef.id })
      }
      await loadConsultas()
      resetForm()
      toast.success('Consulta criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar consulta:', error)
      toast.error('Erro ao criar consulta')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConsulta || !userProfile) return

    // Para profissional autônomo, não precisa preencher idProfissional
    const precisaProfissional = userProfile.perfil !== 'profissional'
    
    if (!formData.idPaciente || !formData.dataConsulta || !formData.horaConsulta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (precisaProfissional && !formData.idProfissional) {
      toast.error('Selecione um profissional')
      return
    }

    const dataHora = new Date(`${formData.dataConsulta}T${formData.horaConsulta}`)
    
    if (isPastDateTime(dataHora)) {
      toast.error('Não é possível agendar consultas no passado')
      return
    }

    try {
      // Para profissional autônomo, usar o próprio ID
      let idProfissionalFinal = formData.idProfissional
      let nomeProfissionalFinal = formData.nomeProfissional
      
      if (userProfile.perfil === 'profissional') {
        idProfissionalFinal = userProfile.id
        nomeProfissionalFinal = userProfile.nome
      }

      const targetCollectionForUpdate = (editingConsulta as any).sourceCollection || 'consultas_clinicas'
      if (targetCollectionForUpdate === 'consultas_autonomos' || targetCollectionForUpdate === 'consultas_clinicas') {
        // atualizar usando schema snake_case para ambas as coleções
        await updateDoc(doc(db, targetCollectionForUpdate, editingConsulta.id), {
          id_paciente: formData.idPaciente,
          nm_paciente: formData.nomePaciente,
          id_profissional: idProfissionalFinal,
          nm_profissional: nomeProfissionalFinal,
          data_consulta: format(dataHora, "yyyy-MM-dd HH:mm"),
          status: (formData.status || '').charAt(0).toUpperCase() + (formData.status || '').slice(1),
          obs: formData.observacoes,
        })
      } else {
        await updateDoc(doc(db, targetCollectionForUpdate, editingConsulta.id), {
          idPaciente: formData.idPaciente,
          nomePaciente: formData.nomePaciente,
          idProfissional: idProfissionalFinal,
          nomeProfissional: nomeProfissionalFinal,
          dataConsulta: Timestamp.fromDate(dataHora),
          status: formData.status,
          observacoes: formData.observacoes,
        })
      }
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
    setSearchPaciente('')
    setSearchProfissional('')
    setShowPacientesList(false)
    setShowProfissionaisList(false)
    setEditingConsulta(null)
    setShowEditModal(false)
  }

  const pacientesFiltrados = searchPaciente.trim() 
    ? pacientes.filter(p =>
        p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
        p.email.toLowerCase().includes(searchPaciente.toLowerCase())
      )
    : pacientes

  const formatStatus = (status: string) => {
    switch (status) {
      case 'todas':
        return 'Todas'
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

  const profissionaisFiltrados = profissionais.filter(p =>
    p.nome.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    (p.especialidade && p.especialidade.toLowerCase().includes(searchProfissional.toLowerCase()))
  )

  if (!userProfile) {
    return (
      <Layout currentProfile="clinica">
        <div className="loading-state">Carregando perfil...</div>
      </Layout>
    )
  }

  return (
    <Layout currentProfile={userProfile.perfil}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="consultas-container"
      >
        <div className="page-header">
          <h1>
            <Calendar size={28} />
            Consultas
          </h1>
          {(userProfile?.perfil === 'recepcionista' || userProfile?.perfil === 'profissional') && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetForm()
                setShowEditModal(true)
              }}
              className="new-consulta-button"
            >
              <Plus size={20} />
              Nova Consulta
            </motion.button>
          )}
        </div>

        {/* Filtros e Busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="filters-section"
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {/* Barra de Pesquisa - Busca pacientes e médicos */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                Buscar:
              </label>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.875rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                    zIndex: 1
                  }} 
                />
                <input
                  type="text"
                  placeholder="Buscar por paciente ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
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
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
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

            {/* Select de Médicos - Apenas para recepcionista */}
            {((userProfile?.perfil === 'clinica' || userProfile?.perfil === 'recepcionista') && profissionais.length > 0) && (
              <div style={{ minWidth: '280px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  Filtrar por Médico:
                </label>
                <select
                  value={filterFuncionario}
                  onChange={(e) => setFilterFuncionario(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
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
                >
                  <option value="">Todos os médicos</option>
                  {profissionais.map((prof) => (
                    <option key={prof.id} value={prof.nome}>
                      {prof.nome} {prof.especialidade ? `- ${prof.especialidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="filter-tabs">
            {(['todas', 'agendada', 'realizada', 'cancelada', 'nao_compareceu'] as const).map((f) => (
              <motion.button
                key={f}
                onClick={() => setFilter(f)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
              >
                <Filter size={16} />
                {formatStatus(f)}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Lista de Consultas */}
        {loading ? (
          <div className="loading-state">Carregando consultas...</div>
        ) : (
          <div className="consultas-list">
            {consultas.map((consulta, index) => (
              <motion.div
                key={consulta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="consulta-card"
              >
                <div className="consulta-header">
                  <div className="consulta-time">
                    <Clock size={20} />
                    <span>{format(new Date(consulta.dataConsulta), "HH:mm", { locale: ptBR })}</span>
                  </div>
                  <span className={`status-badge status-${consulta.status}`}>
                    {formatStatus(consulta.status)}
                  </span>
                </div>

                <div className="consulta-body">
                  <div className="consulta-info">
                    <div className="info-item">
                      <User size={16} />
                      <div>
                        <p className="label">Paciente</p>
                        <p className="value">{consulta.nomePaciente}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <User size={16} />
                      <div>
                        <p className="label">Profissional</p>
                        <p className="value">{consulta.nomeProfissional}</p>
                      </div>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <div>
                        <p className="label">Data</p>
                        <p className="value">
                          {format(new Date(consulta.dataConsulta), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {consulta.observacoes && (
                    <div className="consulta-observacoes">
                      <p><strong>Observações:</strong> {consulta.observacoes}</p>
                    </div>
                  )}
                </div>

                {userProfile?.perfil !== 'clinica' && (
                  <div className="consulta-actions">
                    {canEditStatus(consulta) && (
                      <>
                        {consulta.status === 'agendada' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CheckCircle size={16} />}
                              onClick={() => handleStatusChange(consulta.id, 'realizada')}
                            >
                              Realizada
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<XCircle size={16} />}
                              onClick={() => handleStatusChange(consulta.id, 'cancelada')}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<XCircle size={16} />}
                              onClick={() => handleStatusChange(consulta.id, 'nao_compareceu')}
                            >
                              Não compareceu
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    {canEdit() && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit2 size={16} />}
                        onClick={() => handleEdit(consulta)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
            {consultas.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="empty-state"
              >
                <Calendar size={64} />
                <p>Nenhuma consulta encontrada</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Modal de Edição/Criação */}
        <AnimatePresence>
          {showEditModal && (
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
                  <h2>
                    {editingConsulta ? (
                      <>
                        <Edit2 size={24} />
                        Editar Consulta
                      </>
                    ) : (
                      <>
                        <Plus size={24} />
                        Nova Consulta
                      </>
                    )}
                  </h2>
                  <button onClick={resetForm} className="close-button">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={editingConsulta ? handleUpdate : handleCreate} className="modal-body">
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
                  {userProfile.perfil !== 'profissional' && (
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
                                  horaConsulta: '', // Limpar hora ao trocar profissional
                                })
                                setSearchProfissional('')
                                setShowProfissionaisList(false)
                                // Carregar horários se já tiver data selecionada
                                if (formData.dataConsulta) {
                                  loadHorariosDisponiveis(profissional.id, formData.dataConsulta)
                                }
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
                  )}
                  {userProfile.perfil === 'profissional' && (
                    <div className="form-group">
                      <label>Profissional</label>
                      <div style={{ padding: '0.875rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>{userProfile.nome}</p>
                        {(userProfile as any).especialidade && (
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{(userProfile as any).especialidade}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Data *</label>
                    <input
                      type="date"
                      value={formData.dataConsulta}
                      onChange={(e) => {
                        const dataSelecionada = e.target.value
                        setFormData({ ...formData, dataConsulta: dataSelecionada, horaConsulta: '' })
                        let idProfissionalFinal = formData.idProfissional
                        if (userProfile?.perfil === 'profissional') {
                          idProfissionalFinal = userProfile.id
                        }
                        if (idProfissionalFinal && dataSelecionada) {
                          loadHorariosDisponiveis(idProfissionalFinal, dataSelecionada)
                        }
                      }}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora *</label>
                    {formData.dataConsulta ? (
                      (() => {
                        let idProfissionalFinal = formData.idProfissional
                        if (userProfile?.perfil === 'profissional') {
                          idProfissionalFinal = userProfile.id
                        }
                        if (idProfissionalFinal && horariosDisponiveis.length > 0) {
                          return (
                            <select
                              value={formData.horaConsulta}
                              onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
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
                          )
                        } else if (idProfissionalFinal) {
                          return (
                            <div>
                              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Nenhum horário disponível para esta data. Adicione horários disponíveis primeiro.
                              </p>
                              <input
                                type="time"
                                value={formData.horaConsulta}
                                onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
                                disabled
                                className="form-input"
                                style={{ opacity: 0.5 }}
                              />
                            </div>
                          )
                        } else {
                          return (
                            <input
                              type="time"
                              value={formData.horaConsulta}
                              onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
                              disabled
                              className="form-input"
                              style={{ opacity: 0.5 }}
                              placeholder="Selecione um profissional primeiro"
                            />
                          )
                        }
                      })()
                    ) : (
                      <input
                        type="time"
                        value={formData.horaConsulta}
                        onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
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
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Consulta['status'] })}
                    >
                        <option value="agendada">Agendada</option>
                        <option value="realizada">Realizada</option>
                        <option value="cancelada">Cancelada</option>
                        <option value="nao_compareceu">Não compareceu</option>
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
                      <Save size={18} />
                      {editingConsulta ? 'Salvar' : 'Criar Consulta'}
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
      {DialogComponent}
      <style>{`
        .consultas-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .new-consulta-button {
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

        .new-consulta-button:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .filters-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          width: 100%;
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

        .search-input::placeholder {
          color: var(--color-text-muted);
        }


        .clear-search-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 2;
        }

        .clear-search-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
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

        .consultas-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .consulta-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .consulta-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .consulta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .consulta-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-primary-medico);
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

        .consulta-body {
          margin-bottom: 1rem;
        }

        .consulta-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .info-item svg {
          color: var(--color-text-muted);
          margin-top: 0.25rem;
          flex-shrink: 0;
        }

        .info-item .label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0 0 0.25rem 0;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .info-item .value {
          font-size: 0.95rem;
          color: var(--color-text);
          margin: 0;
          font-weight: 500;
        }

        .consulta-observacoes {
          padding: 1rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          margin-top: 1rem;
        }

        .consulta-observacoes p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
          line-height: 1.6;
        }

        .consulta-observacoes strong {
          color: var(--color-text);
        }

        .consulta-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--color-text-muted);
        }

        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 1.125rem;
          margin: 0;
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

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--color-text-muted);
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

        .modal-form {
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

        .form-input {
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

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .search-wrapper {
          position: relative;
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

        .clear-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
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

        .action-button.primary {
          background: linear-gradient(135deg, var(--color-primary-medico), var(--color-primary-medico-dark));
          color: white;
        }

        .action-button.primary:hover {
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </Layout>
  )
}

