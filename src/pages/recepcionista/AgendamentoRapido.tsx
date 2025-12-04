import Layout from '@/components/Layout'
import { toast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/firebase/config'
import { Paciente, Profissional } from '@/types'
import { format } from 'date-fns'
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Clock, Plus, Search, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AgendamentoRapido() {
  const { userProfile } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [searchPaciente, setSearchPaciente] = useState('')
  const [searchProfissional, setSearchProfissional] = useState('')
  const [showPacientesList, setShowPacientesList] = useState(false)
  const [showProfissionaisList, setShowProfissionaisList] = useState(false)
  const [formData, setFormData] = useState({
    idPaciente: '',
    idProfissional: '',
    dataConsulta: '',
    horaConsulta: '',
    observacoes: '',
  })

  useEffect(() => {
    if (userProfile) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]) // Recarrega quando entrar na página

  const loadData = async () => {
    if (!userProfile) return

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
                dataCriacao: pacienteDoc.data().dataCriacao?.toDate() || new Date(),
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

      // Carregar profissionais
      const profissionaisRef = collection(db, 'profissionais')
      const profissionaisQuery = query(
        profissionaisRef,
        where('idClinica', '==', (userProfile as any).idClinica || '')
      )
      const profissionaisSnap = await getDocs(profissionaisQuery)
      const profissionaisData = profissionaisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataCriacao: doc.data().dataCriacao?.toDate() || new Date(),
      })) as Profissional[]
      setProfissionais(profissionaisData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    setLoading(true)
    try {
      const paciente = pacientes.find(p => p.id === formData.idPaciente)
      const profissional = profissionais.find(p => p.id === formData.idProfissional)

      if (!paciente || !profissional) {
        toast.error('Paciente ou profissional não encontrado')
        return
      }

      // Parse da data (formato yyyy-MM-dd)
      const [ano, mes, dia] = formData.dataConsulta.split('-')
      const [hora, minuto] = formData.horaConsulta.split(':')
      const dataConsulta = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora),
        parseInt(minuto)
      )

      // Removida validação de data passada - permite agendar consultas no passado para registro

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

      toast.success('Consulta agendada com sucesso!')
      resetForm()
      setShowModal(false)
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
  }

  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
    p.email.toLowerCase().includes(searchPaciente.toLowerCase())
  )

  const filteredProfissionais = profissionais.filter(p =>
    p.nome.toLowerCase().includes(searchProfissional.toLowerCase()) ||
    p.especialidade?.toLowerCase().includes(searchProfissional.toLowerCase())
  )

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
            className="add-button"
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
          <p>
            Agende consultas rapidamente selecionando o paciente, profissional, data e hora.
          </p>
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
                  <h2>Nova Consulta</h2>
                  <button
                    onClick={() => {
                      resetForm()
                      setShowModal(false)
                    }}
                    className="close-button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                  <div className="form-group">
                    <label>
                      <User size={16} />
                      Paciente
                    </label>
                    <div className="search-wrapper">
                      <Search size={16} className="search-icon" />
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
                    </div>
                    {showPacientesList && (
                      <div className="dropdown">
                        {filteredPacientes.length > 0 ? (
                          filteredPacientes.map((paciente) => (
                            <div
                              key={paciente.id}
                              className="dropdown-item"
                              onClick={() => {
                                setFormData({ ...formData, idPaciente: paciente.id })
                                setSearchPaciente('')
                                setShowPacientesList(false)
                              }}
                            >
                              <div>
                                <strong>{paciente.nome}</strong>
                                <span>{paciente.email}</span>
                                {paciente.telefone && (
                                  <span className="telefone">{paciente.telefone}</span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-empty">
                            <p>Nenhum paciente encontrado</p>
                            <span>Tente buscar por nome ou email</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <User size={16} />
                      Profissional
                    </label>
                    <div className="search-wrapper">
                      <Search size={16} className="search-icon" />
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
                      <div className="dropdown">
                        {filteredProfissionais.length > 0 ? (
                          filteredProfissionais.map((profissional) => (
                            <div
                              key={profissional.id}
                              className="dropdown-item"
                              onClick={() => {
                                setFormData({ ...formData, idProfissional: profissional.id })
                                setSearchProfissional('')
                                setShowProfissionaisList(false)
                              }}
                            >
                              <div>
                                <strong>{profissional.nome}</strong>
                                <span>{profissional.especialidade || 'Sem especialidade'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-empty">
                            <p>Nenhum profissional encontrado</p>
                            <span>Tente buscar por nome ou especialidade</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <Calendar size={16} />
                        Data
                      </label>
                      <input
                        type="date"
                        value={formData.dataConsulta}
                        onChange={(e) => setFormData({ ...formData, dataConsulta: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Clock size={16} />
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
                      disabled={loading || !formData.idPaciente || !formData.idProfissional}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="save-button"
                    >
                      {loading ? 'Agendando...' : 'Agendar'}
                    </motion.button>
                  </div>
                </form>
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

        .info-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-card p {
          color: var(--color-text-muted);
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
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: 0.75rem;
          width: 90%;
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
          position: relative;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-wrapper {
          position: relative;
        }

        .search-wrapper input[readonly] {
          cursor: pointer;
          background: rgba(139, 92, 246, 0.05);
        }

        .edit-selection {
          position: absolute;
          right: 0.875rem;
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

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
          pointer-events: none;
        }

        .form-group input,
        .form-group textarea {
          padding: 0.875rem 1rem;
          padding-left: 2.5rem;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          color: var(--color-text);
          font-size: 0.95rem;
          transition: all 0.2s;
          width: 100%;
        }

        .form-group input[type="date"],
        .form-group input[type="time"] {
          padding-left: 1rem;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary-medico);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .dropdown {
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
          box-shadow: var(--shadow-lg);
        }

        .dropdown-item {
          padding: 0.875rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid var(--color-border);
        }

        .dropdown-item:last-child {
          border-bottom: none;
        }

        .dropdown-item:hover {
          background: var(--color-surface-elevated);
        }

        .dropdown-item strong {
          display: block;
          color: var(--color-text);
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }

        .dropdown-item span {
          display: block;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }

        .dropdown-item .telefone {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        .dropdown-empty {
          padding: 1.5rem 1rem;
          text-align: center;
        }

        .dropdown-empty p {
          color: var(--color-text);
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0 0 0.5rem 0;
        }

        .dropdown-empty span {
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }

        .selected-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.5rem;
          margin-top: 0.5rem;
        }

        .selected-item > div {
          flex: 1;
        }

        .selected-item strong {
          display: block;
          color: var(--color-primary-medico);
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }

        .selected-item span {
          display: block;
          color: var(--color-text-muted);
          font-size: 0.875rem;
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
          margin-left: 0.5rem;
        }

        .clear-selection:hover {
          background: rgba(139, 92, 246, 0.2);
          color: var(--color-primary-medico);
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

