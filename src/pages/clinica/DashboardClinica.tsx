import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/config'
import { Consulta, Funcionario } from '@/types'
import { useConfirmDialog } from '@/utils/confirmDialog'
import { exportToCSV, exportToExcel, exportToJSON, prepareConsultasForExport } from '@/utils/exportUtils'
import { isPastDateTime } from '@/utils/validators'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Calendar, Clock, Edit2, FileJson, FileSpreadsheet, Save, Trash2, Users, X } from 'lucide-react'
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


export default function DashboardClinica() {
  const { userProfile } = useAuth()
  const { confirm, DialogComponent } = useConfirmDialog()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
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
  const [searchPaciente, setSearchPaciente] = useState('')
  const [searchProfissional, setSearchProfissional] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [showProfissionaisList, setShowProfissionaisList] = useState(false)
  const [stats, setStats] = useState({
    consultasHoje: 0,
    funcionariosAtivos: 0,
    consultasAguardando: 0,
    pacientesAtendidos: 0,
  })

  useEffect(() => {
    if (userProfile) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  useEffect(() => {
    // Só adiciona listener se as listas estiverem visíveis
    if (!showPacientesList && !showProfissionaisList) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Só fecha se clicar fora do search-wrapper E se as listas estiverem abertas
      if (!target.closest('.search-wrapper') && !target.closest('.select-list')) {
        setShowPacientesList(false)
        setShowProfissionaisList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPacientesList, showProfissionaisList])

  const loadData = async () => {
    if (!userProfile || userProfile.perfil !== 'clinica') return

    setLoading(true)
    try {
      // Carregar funcionários
      const funcionariosRef = collection(db, 'funcionarios')
      const funcionariosQuery = query(funcionariosRef, where('idClinica', '==', userProfile.id))
      const funcionariosSnap = await getDocs(funcionariosQuery)
      const funcionariosData = funcionariosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate() || new Date(),
      })) as Funcionario[]
      setFuncionarios(funcionariosData)

      // Carregar apenas pacientes que já tiveram consultas com a clínica
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

      // Carregar profissionais
      const profissionaisRef = collection(db, 'profissionais')
      const profissionaisQuery = query(profissionaisRef, where('idClinica', '==', userProfile.id))
      const profissionaisSnap = await getDocs(profissionaisQuery)
      const profissionaisData = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Profissional[]

      // Carregar funcionários médicos
      const funcionariosMedicos = funcionariosData
        .filter(f => f.cargo === 'medico')
        .map(f => ({
          id: f.id,
          nome: f.nome,
          especialidade: (f as any).especialidade || '',
        })) as Profissional[]

      setProfissionais([...profissionaisData, ...funcionariosMedicos])

      // Carregar consultas (consultas_clinicas) - reutilizando a referência já criada acima
      const consultasQuery2 = query(consultasRef, where('id_clinica', '==', userProfile.id))
      const consultasSnap2 = await getDocs(consultasQuery2)
      const consultasData = consultasSnap2.docs.map(doc => {
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
      setConsultas(consultasData)

      // Calcular estatísticas
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const consultasHoje = consultasData.filter(c => {
        const dataConsulta = new Date(c.dataConsulta)
        dataConsulta.setHours(0, 0, 0, 0)
        return dataConsulta.getTime() === hoje.getTime()
      })

      setStats({
        consultasHoje: consultasHoje.length,
        funcionariosAtivos: funcionariosData.length,
        consultasAguardando: consultasData.filter(c => c.status === 'agendada').length,
        pacientesAtendidos: consultasData.filter(c => c.status === 'realizada').length,
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
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


  const handleExportConsultas = (format: 'json' | 'csv' | 'excel') => {
    const data = prepareConsultasForExport(consultas)
    const filename = `consultas_${userProfile?.nome?.replace(/\s+/g, '_') || 'clinica'}`
    
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

  const handleDelete = async (consultaId: string) => {
    const consulta = consultas.find(c => c.id === consultaId)
    if (!consulta) return

    const confirmed = await confirm(
      'Excluir Consulta',
      `Tem certeza que deseja excluir a consulta de ${consulta.nomePaciente}?`,
      {
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        variant: 'danger'
      }
    )
    if (!confirmed) return

    try {
      await deleteDoc(doc(db, 'consultas_clinicas', consultaId))
      await loadData()
      toast.success('Consulta excluída com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir consulta:', error)
      toast.error('Erro ao excluir consulta')
    }
  }


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingConsulta) return

    if (!formData.idPaciente || !formData.idProfissional || !formData.dataConsulta || !formData.horaConsulta) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const dataHora = new Date(`${formData.dataConsulta}T${formData.horaConsulta}`)
    
    if (isPastDateTime(dataHora)) {
      toast.error('Não é possível agendar consultas no passado')
      return
    }

    try {
      await updateDoc(doc(db, 'consultas_clinicas', editingConsulta.id), {
        id_paciente: formData.idPaciente,
        nm_paciente: formData.nomePaciente,
        id_profissional: formData.idProfissional,
        nm_profissional: formData.nomeProfissional,
        data_consulta: format(dataHora, 'yyyy-MM-dd HH:mm'),
        status: (formData.status || '').charAt(0).toUpperCase() + (formData.status || '').slice(1),
        obs: formData.observacoes,
      })
      await loadData()
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

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email.toLowerCase().includes(searchPaciente.toLowerCase())
  )

  const profissionaisFiltrados = profissionais.filter(p =>
    p.nome.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    (p.especialidade && p.especialidade.toLowerCase().includes(searchProfissional.toLowerCase()))
  )

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
        className="dashboard-content"
      >
        <div className="dashboard-header">
          <div>
            <h1>Dashboard da Clínica</h1>
            <p>Bem-vindo, {userProfile?.nome}</p>
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

          </div>
        </motion.div>

        {/* Cards de Estatísticas */}
        <div className="stats-grid">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Calendar size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{stats.consultasHoje}</h3>
              <p>Consultas Hoje</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Users size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{stats.funcionariosAtivos}</h3>
              <p>Funcionários Ativos</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Clock size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{stats.consultasAguardando}</h3>
              <p>Consultas Aguardando</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <Activity size={24} color="#8b5cf6" />
            </div>
            <div className="stat-content">
              <h3>{stats.pacientesAtendidos}</h3>
              <p>Pacientes Atendidos</p>
            </div>
          </motion.div>
        </div>

        {/* Consultas Recentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="section-card"
        >
          <div className="section-header">
            <h2>Consultas Recentes</h2>
          </div>
          <div className="consultas-list">
            {consultas.slice(0, 5).map((consulta, index) => (
              <motion.div
                key={consulta.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="consulta-item"
              >
                <div className="consulta-info">
                  <h4>{consulta.nomePaciente}</h4>
                  <p>{consulta.nomeProfissional}</p>
                  <span className="consulta-date">
                    {format(new Date(consulta.dataConsulta), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="consulta-actions-horizontal">
                  <span className={`status-badge status-${consulta.status.toLowerCase()}`}>
                    {getStatusLabel(consulta.status)}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(consulta)}
                    className="action-btn edit-btn"
                    title="Editar consulta"
                  >
                    <Edit2 size={16} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(consulta.id)}
                    className="action-btn delete-btn"
                    title="Excluir consulta"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
            {consultas.length === 0 && (
              <p className="empty-state">Nenhuma consulta encontrada</p>
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
                  {/* Seleção de Paciente */}
                  <div className="form-group">
                    <label>Paciente *</label>
                    <div className="search-wrapper">
                      <input
                        type="text"
                        value={searchPaciente}
                        onChange={(e) => {
                          setSearchPaciente(e.target.value)
                          setShowPacientesList(true)
                        }}
                        onFocus={() => setShowPacientesList(true)}
                        placeholder="Buscar paciente..."
                        className="search-input"
                      />
                      {formData.idPaciente && (
                        <div className="edit-selection">
                          <span>{formData.nomePaciente}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, idPaciente: '', nomePaciente: '' })
                              setSearchPaciente('')
                            }}
                            className="clear-btn"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {showPacientesList && (
                        <div className="select-list">
                          {pacientesFiltrados.length > 0 ? (
                            pacientesFiltrados.map((paciente) => (
                              <div
                                key={paciente.id}
                                className="select-item"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    idPaciente: paciente.id,
                                    nomePaciente: paciente.nome,
                                  })
                                  setSearchPaciente('')
                                  setShowPacientesList(false)
                                }}
                              >
                                <div>
                                  <p className="nome">{paciente.nome}</p>
                                  <p className="email">{paciente.email}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">Nenhum paciente encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seleção de Profissional */}
                  <div className="form-group">
                    <label>Profissional *</label>
                    <div className="search-wrapper">
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
                      {formData.idProfissional && (
                        <div className="edit-selection">
                          <span>{formData.nomeProfissional}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, idProfissional: '', nomeProfissional: '' })
                              setSearchProfissional('')
                            }}
                            className="clear-btn"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {showProfissionaisList && (
                        <div className="select-list">
                          {profissionaisFiltrados.length > 0 ? (
                            profissionaisFiltrados.map((profissional) => (
                              <div
                                key={profissional.id}
                                className="select-item"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    idProfissional: profissional.id,
                                    nomeProfissional: profissional.nome,
                                  })
                                  setSearchProfissional('')
                                  setShowProfissionaisList(false)
                                }}
                              >
                                <div>
                                  <p className="nome">{profissional.nome}</p>
                                  {profissional.especialidade && (
                                    <p className="especialidade">{profissional.especialidade}</p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">Nenhum profissional encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--color-background);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          gap: 1rem;
        }

        .consulta-actions-horizontal {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-btn {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .edit-btn:hover {
          background: rgba(59, 130, 246, 0.2);
        }

        .delete-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 0.75rem;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: var(--color-background);
          color: var(--color-text);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
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
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          background: var(--color-background);
          color: var(--color-text);
          font-size: 0.95rem;
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

        .search-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          background: var(--color-background);
          color: var(--color-text);
        }

        .edit-selection {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          margin-top: 0.5rem;
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
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
          margin-top: 0.25rem;
        }

        .select-item {
          padding: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .select-item:hover {
          background: var(--color-background);
        }

        .select-item .nome {
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: var(--color-text);
        }

        .select-item .email,
        .select-item .especialidade {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        .cancel-button,
        .save-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
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

        .consulta-info h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .consulta-info p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 0.25rem 0;
        }

        .consulta-date {
          font-size: 0.75rem;
          color: var(--color-text-muted);
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
      `}</style>
    </Layout>
  )
}

