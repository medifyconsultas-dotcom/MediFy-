import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { auth, db } from '@/firebase/config'
import { isPastDateTime } from '@/utils/validators'
import { format } from 'date-fns'
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Clock, Plus, Save, Search, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Paciente {
  id: string
  nome: string
  email: string
  telefone?: string
  data_nascimento?: string
  cpf?: string
  endereco?: string
  plano?: string
}

interface Profissional {
  id: string
  nome: string
  especialidade?: string
}

export default function Agendamento() {
  const { userProfile } = useAuth()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    idPaciente: '',
    idProfissional: '',
    dataConsulta: '',
    horaConsulta: '',
    observacoes: '',
  })
  const [searchPaciente, setSearchPaciente] = useState('')
  const [searchProfissional, setSearchProfissional] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [showProfissionaisList, setShowProfissionaisList] = useState(false)
  const [createPacienteMode, setCreatePacienteMode] = useState(false)
  const [createPacienteLoading, setCreatePacienteLoading] = useState(false)
  const [newPaciente, setNewPaciente] = useState({
    nome: '',
    email: '',
    senha: '',
    data_nascimento: '',
    telefone: '',
    cpf: '',
    endereco: '',
    plano: '',
  })
  const [showCreatePacienteModal, setShowCreatePacienteModal] = useState(false)

  useEffect(() => {
    if (userProfile) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  const loadData = async () => {
    if (!userProfile || userProfile.perfil !== 'recepcionista') return

    setLoading(true)
    try {
      // Carregar apenas pacientes que já tiveram consultas com a clínica
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

      // Carregar profissionais da clínica
      const profissionaisRef = collection(db, 'profissionais')
      const profissionaisQuery = query(
        profissionaisRef,
        where('idClinica', '==', (userProfile as any).idClinica)
      )
      const profissionaisSnap = await getDocs(profissionaisQuery)
      const profissionaisData = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Profissional[]

      // Carregar funcionários médicos
      const funcionariosRef = collection(db, 'funcionarios')
      const funcionariosQuery = query(
        funcionariosRef,
        where('idClinica', '==', (userProfile as any).idClinica),
        where('cargo', '==', 'medico')
      )
      const funcionariosSnap = await getDocs(funcionariosQuery)
      const funcionariosData = funcionariosSnap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        especialidade: doc.data().especialidade || '',
      })) as Profissional[]

      setProfissionais([...profissionaisData, ...funcionariosData])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile || userProfile.perfil !== 'recepcionista') return

    try {
      setLoading(true)
      
      // Encontrar paciente e profissional selecionados
      const paciente = pacientes.find(p => p.id === formData.idPaciente)
      const profissional = profissionais.find(p => p.id === formData.idProfissional)

      if (!paciente || !profissional) {
        toast.error('Paciente ou profissional não encontrado')
        return
      }

      // Combinar data e hora
      const [ano, mes, dia] = formData.dataConsulta.split('-')
      const [hora, minuto] = formData.horaConsulta.split(':')
      const dataConsulta = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto))

      // Validar se a data/hora não é no passado
      if (isPastDateTime(dataConsulta)) {
        toast.error('Não é possível agendar consultas no passado')
        return
      }

      // Determinar coleção alvo (clinica vs autonomo)
      const idClinica = (userProfile as any).idClinica || null
      const targetCollectionName = idClinica ? 'consultas_clinicas' : 'consultas_autonomos'

      // Verificar conflitos de horário para o profissional na coleção correta
      const consultasRef = collection(db, targetCollectionName)
      const idProfField = targetCollectionName === 'consultas_autonomos' || targetCollectionName === 'consultas_clinicas' ? 'id_profissional' : 'idProfissional'
      const dataConsultaField = targetCollectionName === 'consultas_autonomos' || targetCollectionName === 'consultas_clinicas' ? 'data_consulta' : 'dataConsulta'
      const conflitosQuery = query(
        consultasRef,
        where(idProfField, '==', formData.idProfissional)
      )
      const conflitosSnap = await getDocs(conflitosQuery)
      
      const conflitos = conflitosSnap.docs
        .map(doc => {
          const data = doc.data()
          const rawStatus = data.status || ''
          const statusNorm = String(rawStatus).toLowerCase()
          const rawData = data[dataConsultaField]
          const parsedData = typeof rawData === 'string' ? new Date(rawData.replace(' ', 'T')) : (rawData?.toDate?.() || new Date())
          return {
            id: doc.id,
            status: statusNorm,
            dataConsulta: parsedData,
          }
        })
        .filter(c => c.status === 'agendada' || c.status === 'confirmada')

      // Verificar se há conflito (mesmo profissional, mesmo horário, status agendada/confirmada)
      const conflito = conflitos.find(c => {
        const diff = Math.abs(c.dataConsulta.getTime() - dataConsulta.getTime())
        return diff < 30 * 60 * 1000 // 30 minutos de diferença
      })

      if (conflito) {
        toast.error('Já existe uma consulta agendada para este profissional neste horário')
        return
      }

      // Criar consulta na coleção apropriada
      const consultaDataClinica = {
        id_paciente: formData.idPaciente,
        nm_paciente: paciente.nome,
        id_profissional: formData.idProfissional,
        nm_profissional: profissional.nome,
        id_clinica: idClinica,
        nm_clinica: (userProfile as any).nome || '',
        data_consulta: format(dataConsulta, 'yyyy-MM-dd HH:mm'),
        status: 'Agendada',
        obs: formData.observacoes || '',
        created_at: Timestamp.now(),
        tipo_atendimento: 'clinica',
      }

      const consultaDataAutonomo = {
        id_paciente: formData.idPaciente,
        nm_paciente: paciente.nome,
        id_profissional: formData.idProfissional,
        nm_profissional: profissional.nome,
        id_clinica: idClinica,
        data_consulta: format(dataConsulta, 'yyyy-MM-dd HH:mm'),
        status: 'Agendada',
        obs: formData.observacoes || '',
        created_at: Timestamp.now(),
        tipo_atendimento: 'autonomo',
      }

      if (targetCollectionName === 'consultas_clinicas') {
        const ref = await addDoc(collection(db, targetCollectionName), consultaDataClinica)
        await updateDoc(doc(db, targetCollectionName, ref.id), { id: ref.id })
      } else {
        const ref = await addDoc(collection(db, targetCollectionName), consultaDataAutonomo)
        await updateDoc(doc(db, targetCollectionName, ref.id), { id: ref.id })
      }

      // Resetar formulário
      resetForm()
      toast.success('Consulta agendada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error)
      toast.error(error.message || 'Erro ao agendar consulta')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      idPaciente: '',
      idProfissional: '',
      dataConsulta: '',
      horaConsulta: '',
      observacoes: '',
    })
    setSearchPaciente('')
    setSearchProfissional('')
    setShowPacientesList(false)
    setShowProfissionaisList(false)
    setShowModal(false)
  }

  const pacientesFiltrados = pacientes.filter(p => 
    p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email.toLowerCase().includes(searchPaciente.toLowerCase())
  )

  const profissionaisFiltrados = profissionais.filter(p => 
    p.nome.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    (p.especialidade && p.especialidade.toLowerCase().includes(searchProfissional.toLowerCase()))
  )

  // Data mínima: hoje
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataMinima = format(hoje, 'dd/MM/yyyy')

  return (
    <Layout currentProfile="recepcionista">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="agendamento-container"
      >
        <div className="page-header">
          <h1>
            <Calendar size={28} />
            Agendamento Rápido
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="new-button"
          >
            <Plus size={20} />
            Nova Consulta
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="info-card"
        >
          <p>Selecione um paciente e profissional para agendar uma nova consulta rapidamente.</p>
        </motion.div>

        {/* Modal de Agendamento */}
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
                  <h2>
                    <Calendar size={24} />
                    Nova Consulta
                  </h2>
                  <button onClick={() => resetForm()} className="close-button">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="agendamento-form">
                  {/* Seleção de Paciente */}
                  <div className="form-section">
                    <label>
                      <User size={18} />
                      Paciente
                    </label>
                    <div className="search-container">
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
                            setFormData({ ...formData, idPaciente: '' })
                          }
                        }}
                        onFocus={() => {
                          setShowPacientesList(true)
                          setSearchPaciente('')
                        }}
                        className="search-input"
                        readOnly={!!formData.idPaciente && !showPacientesList}
                      />
                      {formData.idPaciente && !showPacientesList && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, idPaciente: '' })
                            setSearchPaciente('')
                            setShowPacientesList(true)
                          }}
                          className="edit-selection"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCreatePacienteModal(true)}
                        style={{ marginLeft: 8 }}
                        className="new-patient-button"
                      >
                        <Plus size={14} />
                        Novo paciente
                      </button>
                    </div>
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
                                setFormData({ ...formData, idPaciente: paciente.id })
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
                          )) ): (
                          <div className="empty-state">
                            <p>Nenhum paciente encontrado</p>
                            <span>Tente buscar por nome ou email</span>
                            <div style={{ marginTop: 12 }}>
                              {!createPacienteMode ? (
                                <button
                                  type="button"
                                  onClick={() => setCreatePacienteMode(true)}
                                  className="empty-state-button"
                                >
                                  <Plus size={14} />
                                  Criar novo paciente
                                </button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <input
                                    type="text"
                                    placeholder="Nome completo"
                                    value={newPaciente.nome}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, nome: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="email"
                                    placeholder="Email"
                                    value={newPaciente.email}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, email: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="password"
                                    placeholder="Senha (defina uma senha temporária)"
                                    value={(newPaciente as any).senha}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, senha: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="date"
                                    placeholder="Data de nascimento"
                                    value={(newPaciente as any).data_nascimento}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, data_nascimento: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="text"
                                    placeholder="CPF"
                                    value={(newPaciente as any).cpf}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, cpf: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Endereço (opcional)"
                                    value={(newPaciente as any).endereco}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, endereco: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Plano (opcional)"
                                    value={(newPaciente as any).plano}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, plano: e.target.value })}
                                    className="search-input"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Telefone (opcional)"
                                    value={newPaciente.telefone}
                                    onChange={(e) => setNewPaciente({ ...newPaciente, telefone: e.target.value })}
                                    className="search-input"
                                  />
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => setCreatePacienteMode(false)}
                                      className="cancel-button"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!newPaciente.nome || !newPaciente.email) {
                                          toast.error('Nome e email são obrigatórios')
                                          return
                                        }
                                        try {
                                          setCreatePacienteLoading(true)
                                          const pacientesRef = collection(db, 'pacientes')
                                          const payload = {
                                            nome: newPaciente.nome,
                                            email: newPaciente.email,
                                            senha: (newPaciente as any).senha || '',
                                            data_nascimento: (newPaciente as any).data_nascimento || '',
                                            telefone: newPaciente.telefone || '',
                                            cpf: (newPaciente as any).cpf || '',
                                            endereco: (newPaciente as any).endereco || '',
                                            plano: (newPaciente as any).plano || '',
                                            created_at: Timestamp.now(),
                                          }
                                          const ref = await addDoc(pacientesRef, payload)
                                          await updateDoc(doc(db, 'pacientes', ref.id), { id: ref.id })
                                          setPacientes(prev => [{ id: ref.id, nome: newPaciente.nome, email: newPaciente.email, telefone: newPaciente.telefone, data_nascimento: (newPaciente as any).data_nascimento || '', cpf: (newPaciente as any).cpf || '', endereco: (newPaciente as any).endereco || '', plano: (newPaciente as any).plano || '' }, ...prev])
                                          setFormData({ ...formData, idPaciente: ref.id })
                                          setSearchPaciente('')
                                          setShowPacientesList(false)
                                          setCreatePacienteMode(false)
                                          setNewPaciente({ nome: '', email: '', senha: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' })
                                          toast.success('Paciente criado e selecionado')
                                        } catch (err: any) {
                                          console.error('Erro ao criar paciente:', err)
                                          toast.error(err.message || 'Erro ao criar paciente')
                                        } finally {
                                          setCreatePacienteLoading(false)
                                        }
                                      }}
                                      className="save-button"
                                      disabled={createPacienteLoading}
                                    >
                                      {createPacienteLoading ? 'Criando...' : 'Criar paciente'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Se o usuário ativou modo de criação, mostrar formulário completo para novo paciente */}
                      </div>
                    )}
                  </div>

                  {/* Seleção de Profissional */}
                  <div className="form-section">
                    <label>
                      <User size={18} />
                      Profissional
                    </label>
                    <div className="search-container">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Clique para ver profissionais ou busque por nome/especialidade..."
                        value={formData.idProfissional && !showProfissionaisList 
                          ? profissionais.find(p => p.id === formData.idProfissional)?.nome || ''
                          : searchProfissional}
                        onChange={(e) => {
                          setSearchProfissional(e.target.value)
                          setShowProfissionaisList(true)
                          if (!e.target.value) {
                            setFormData({ ...formData, idProfissional: '' })
                          }
                        }}
                        onFocus={() => {
                          setShowProfissionaisList(true)
                          setSearchProfissional('')
                        }}
                        className="search-input"
                        readOnly={!!formData.idProfissional && !showProfissionaisList}
                      />
                      {formData.idProfissional && !showProfissionaisList && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, idProfissional: '' })
                            setSearchProfissional('')
                            setShowProfissionaisList(true)
                          }}
                          className="edit-selection"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {showProfissionaisList && (
                      <div className="select-list">
                        {profissionaisFiltrados.length > 0 ? (
                          profissionaisFiltrados.map(profissional => (
                            <motion.button
                              key={profissional.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setFormData({ ...formData, idProfissional: profissional.id })
                                setSearchProfissional('')
                                setShowProfissionaisList(false)
                              }}
                              className={`select-item ${formData.idProfissional === profissional.id ? 'selected' : ''}`}
                            >
                              <div>
                                <p className="name">{profissional.nome}</p>
                                {profissional.especialidade && (
                                  <p className="email">{profissional.especialidade}</p>
                                )}
                              </div>
                            </motion.button>
                          ))
                        ) : (
                          <div className="empty-state">
                            <p>Nenhum profissional encontrado</p>
                            <span>Tente buscar por nome ou especialidade</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Data e Hora */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <Calendar size={18} />
                        Data
                      </label>
                      <input
                        type="date"
                        value={formData.dataConsulta}
                        onChange={(e) => setFormData({ ...formData, dataConsulta: e.target.value })}
                        min={format(hoje, 'yyyy-MM-dd')}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Clock size={18} />
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.horaConsulta}
                        onChange={(e) => setFormData({ ...formData, horaConsulta: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="form-group">
                    <label>Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                      placeholder="Observações adicionais..."
                    />
                  </div>

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
                      disabled={loading || !formData.idPaciente || !formData.idProfissional}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="save-button"
                    >
                      <Save size={18} />
                      {loading ? 'Agendando...' : 'Agendar Consulta'}
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
                    <label>Nome *</label>
                    <input 
                      type="text" 
                      value={newPaciente.nome} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, nome: e.target.value })}
                      placeholder="Nome completo do paciente"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input 
                      type="email" 
                      value={newPaciente.email} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Senha (temporária) *</label>
                    <input 
                      type="password" 
                      value={(newPaciente as any).senha} 
                      onChange={(e) => setNewPaciente({ ...newPaciente, senha: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      O paciente poderá alterar esta senha após o primeiro login
                    </small>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => { 
                      setShowCreatePacienteModal(false)
                      setNewPaciente({ nome: '', email: '', senha: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' })
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
                      const email = newPaciente.email?.trim()
                      const senha = (newPaciente as any).senha?.trim()
                      
                      if (!nome || !email) { 
                        toast.error('Nome e email são obrigatórios')
                        return 
                      }
                      
                      if (!senha || senha.length < 6) {
                        toast.error('A senha deve ter pelo menos 6 caracteres')
                        return
                      }
                      
                      try {
                        setCreatePacienteLoading(true)
                        
                        // Criar usuário no Firebase Auth
                        let authUser
                        try {
                          authUser = await createUserWithEmailAndPassword(auth, email, senha)
                        } catch (authError: any) {
                          if (authError.code === 'auth/email-already-in-use') {
                            toast.error('Este email já está cadastrado')
                            return
                          }
                          throw authError
                        }
                        
                        // Criar documento do paciente no Firestore usando o UID do Auth
                        const idClinica = (userProfile as any).idClinica
                        const payload: any = {
                          id: authUser.user.uid,
                          nome,
                          email,
                          data_nascimento: (newPaciente as any).data_nascimento || '',
                          telefone: newPaciente.telefone || '',
                          cpf: (newPaciente as any).cpf || '',
                          endereco: (newPaciente as any).endereco || '',
                          plano: (newPaciente as any).plano || '',
                          perfil: 'paciente',
                          idClinica: idClinica || null,
                          created_at: Timestamp.now(),
                        }
                        
                        // Usar o UID do Auth como ID do documento
                        await setDoc(doc(db, 'pacientes', authUser.user.uid), payload)
                        
                        const created = { 
                          id: authUser.user.uid, 
                          nome, 
                          email, 
                          telefone: newPaciente.telefone || '', 
                          data_nascimento: (newPaciente as any).data_nascimento || '', 
                          cpf: (newPaciente as any).cpf || '', 
                          endereco: (newPaciente as any).endereco || '', 
                          plano: (newPaciente as any).plano || '' 
                        }
                        
                        setPacientes(prev => [created, ...prev])
                        setFormData({ ...formData, idPaciente: authUser.user.uid, nomePaciente: nome })
                        setSearchPaciente('')
                        setShowPacientesList(false)
                        setShowCreatePacienteModal(false)
                        setNewPaciente({ nome: '', email: '', senha: '', data_nascimento: '', telefone: '', cpf: '', endereco: '', plano: '' })
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
        .agendamento-container {
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

        .info-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-card p {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          margin: 0;
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
          padding: 1.5rem;
        }

        .agendamento-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-section label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-container .edit-selection {
          position: absolute;
          right: 0.75rem;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          background: var(--color-background);
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

        .search-input[readonly] {
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
        }

        .edit-selection:hover {
          background: rgba(139, 92, 246, 0.2);
          color: var(--color-primary-medico);
        }

        .select-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.5rem;
          background: var(--color-background);
        }

        .select-item {
          padding: 0.875rem;
          background: var(--color-surface);
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

        .selected-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          margin-top: 0.5rem;
        }

        .selected-item .name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-primary-medico);
          margin: 0 0 0.25rem 0;
        }

        .selected-item .email {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .clear-selection {
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
        }

        .clear-selection:hover {
          background: rgba(139, 92, 246, 0.2);
          color: var(--color-primary-medico);
        }

        .empty-state {
          padding: 2rem 1rem;
          text-align: center;
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

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
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
      `}</style>
    </Layout>
  )
}

