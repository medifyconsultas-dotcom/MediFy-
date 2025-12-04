import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Calendar, Clock, Plus, X, Check, Repeat, CalendarDays, Trash2 } from 'lucide-react'
import { format, parse } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { toast } from '@/components/Toast'

interface HorarioDisponivel {
  id: string
  tipo: 'recorrente' | 'especifico'
  diaSemana?: number // 0 = domingo, 1 = segunda, ..., 6 = sábado (sempre presente)
  data?: string // YYYY-MM-DD (data específica)
  hora: string // HH:MM
  disponivel: boolean
}

interface HorariosDisponiveisProps {
  profissionalId: string
  profissionalNome?: string
  readOnly?: boolean
}

// Horários disponíveis padrão (de hora em hora)
const HORARIOS_PADRAO = Array.from({ length: 13 }, (_, i) => {
  const hora = 8 + i // Das 8h às 20h
  return `${hora.toString().padStart(2, '0')}:00`
})

// Dias da semana
const DIAS_SEMANA = [
  { valor: 0, label: 'Domingo', abreviacao: 'Dom' },
  { valor: 1, label: 'Segunda-feira', abreviacao: 'Seg' },
  { valor: 2, label: 'Terça-feira', abreviacao: 'Ter' },
  { valor: 3, label: 'Quarta-feira', abreviacao: 'Qua' },
  { valor: 4, label: 'Quinta-feira', abreviacao: 'Qui' },
  { valor: 5, label: 'Sexta-feira', abreviacao: 'Sex' },
  { valor: 6, label: 'Sábado', abreviacao: 'Sáb' },
]

export default function HorariosDisponiveis({ 
  profissionalId, 
  profissionalNome,
  readOnly = false 
}: HorariosDisponiveisProps) {
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [tipoHorario, setTipoHorario] = useState<'recorrente' | 'especifico'>('recorrente')
  const [modoSelecao, setModoSelecao] = useState(false)
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([])
  const [collectionName, setCollectionName] = useState<'profissionais' | 'funcionarios'>('profissionais')
  
  // Formulário para horários recorrentes
  const [formRecorrente, setFormRecorrente] = useState({
    diasSemana: [] as number[],
    horariosSelecionados: [] as string[],
    horarioEspecifico: '', // Campo para adicionar horário customizado
    datasPorDia: {} as Record<number, string>, // Data específica para cada dia da semana
    dataInicio: '', // Data inicial do intervalo
    dataFim: '', // Data final do intervalo
  })
  
  // Formulário para horários específicos
  const [formEspecifico, setFormEspecifico] = useState({
    data: '',
    horariosSelecionados: [] as string[],
  })

  useEffect(() => {
    loadHorarios()
  }, [profissionalId])

  const loadHorarios = async () => {
    setLoading(true)
    try {
      // Verificar se é funcionário de clínica ou profissional autônomo
      let collectionToUse = 'profissionais'
      try {
        const funcionarioDoc = await getDoc(doc(db, 'funcionarios', profissionalId))
        if (funcionarioDoc.exists()) {
          collectionToUse = 'funcionarios'
        }
      } catch (e) {
        // Se não conseguir verificar, assume profissional autônomo
      }
      
      setCollectionName(collectionToUse)
      
      const horariosRef = collection(db, collectionToUse, profissionalId, 'horarios')
      const horariosQuery = query(horariosRef)
      const horariosSnap = await getDocs(horariosQuery)
      
      const horariosData = horariosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as HorarioDisponivel[]

      // Ordenar: primeiro recorrentes, depois específicos
      horariosData.sort((a, b) => {
        if (a.tipo !== b.tipo) {
          return a.tipo === 'recorrente' ? -1 : 1
        }
        if (a.tipo === 'recorrente' && b.tipo === 'recorrente') {
          return (a.diaSemana || 0) - (b.diaSemana || 0)
        }
        if (a.tipo === 'especifico' && b.tipo === 'especifico') {
          const dataA = `${a.data}T${a.hora}`
          const dataB = `${b.data}T${b.hora}`
          return dataA.localeCompare(dataB)
        }
        return 0
      })

      setHorarios(horariosData)
    } catch (error: any) {
      console.error('Erro ao carregar horários:', error)
      toast.error('Erro ao carregar horários disponíveis')
    } finally {
      setLoading(false)
    }
  }

  const toggleHorario = (hora: string, tipo: 'recorrente' | 'especifico') => {
    if (tipo === 'recorrente') {
      setFormRecorrente(prev => ({
        ...prev,
        horariosSelecionados: prev.horariosSelecionados.includes(hora)
          ? prev.horariosSelecionados.filter(h => h !== hora)
          : [...prev.horariosSelecionados, hora]
      }))
    } else {
      setFormEspecifico(prev => ({
        ...prev,
        horariosSelecionados: prev.horariosSelecionados.includes(hora)
          ? prev.horariosSelecionados.filter(h => h !== hora)
          : [...prev.horariosSelecionados, hora]
      }))
    }
  }

  const atualizarDataDiaSemana = (dia: number, data: string) => {
    setFormRecorrente(prev => ({
      ...prev,
      datasPorDia: {
        ...prev.datasPorDia,
        [dia]: data
      }
    }))
  }

  // Função para preencher dias da semana a partir de um intervalo de datas
  const preencherDiasPorIntervalo = (dataInicio: string, dataFim: string) => {
    if (!dataInicio || !dataFim) return

    const inicio = parse(dataInicio, 'yyyy-MM-dd', new Date())
    const fim = parse(dataFim, 'yyyy-MM-dd', new Date())
    
    if (inicio > fim) {
      toast.error('A data inicial deve ser anterior à data final')
      return
    }

    const diasSemana: number[] = []
    const datasPorDia: Record<number, string> = {}
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Iterar por cada dia no intervalo
    const dataAtual = new Date(inicio)
    while (dataAtual <= fim) {
      // Verificar se a data não é no passado
      if (dataAtual >= hoje) {
        const diaSemana = dataAtual.getDay() // 0 = Domingo, 1 = Segunda, etc.
        const dataStr = format(dataAtual, 'yyyy-MM-dd')
        
        // Adicionar o dia da semana se ainda não foi adicionado
        if (!diasSemana.includes(diaSemana)) {
          diasSemana.push(diaSemana)
        }
        
        // Se já existe uma data para este dia da semana, manter a primeira (mais antiga)
        if (!datasPorDia[diaSemana]) {
          datasPorDia[diaSemana] = dataStr
        }
      }
      
      // Avançar para o próximo dia
      dataAtual.setDate(dataAtual.getDate() + 1)
    }

    // Ordenar os dias da semana
    diasSemana.sort()

    setFormRecorrente(prev => ({
      ...prev,
      diasSemana,
      datasPorDia: { ...prev.datasPorDia, ...datasPorDia },
      dataInicio,
      dataFim
    }))

    if (diasSemana.length === 0) {
      toast.warning('Nenhum dia válido encontrado no intervalo selecionado')
    } else {
      toast.success(`${diasSemana.length} dia(s) da semana preenchido(s) automaticamente`)
    }
  }

  const validarHorario = (hora: string): boolean => {
    // Validar formato HH:MM
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    return regex.test(hora)
  }

  const adicionarHorarioEspecifico = () => {
    const hora = formRecorrente.horarioEspecifico.trim()
    
    if (!hora) {
      toast.error('Digite um horário')
      return
    }

    if (!validarHorario(hora)) {
      toast.error('Formato inválido. Use HH:MM (ex: 14:30)')
      return
    }

    // Verificar se já está selecionado
    if (formRecorrente.horariosSelecionados.includes(hora)) {
      toast.error('Este horário já está selecionado')
      return
    }

    // Adicionar à lista de horários selecionados
    setFormRecorrente(prev => ({
      ...prev,
      horariosSelecionados: [...prev.horariosSelecionados, hora],
      horarioEspecifico: '', // Limpar o campo
    }))

    toast.success(`Horário ${hora} adicionado`)
  }

  const selecionarTodosHorarios = (tipo: 'recorrente' | 'especifico') => {
    if (tipo === 'recorrente') {
      setFormRecorrente(prev => ({
        ...prev,
        horariosSelecionados: HORARIOS_PADRAO
      }))
    } else {
      setFormEspecifico(prev => ({
        ...prev,
        horariosSelecionados: HORARIOS_PADRAO
      }))
    }
  }

  const deselecionarTodosHorarios = (tipo: 'recorrente' | 'especifico') => {
    if (tipo === 'recorrente') {
      setFormRecorrente(prev => ({
        ...prev,
        horariosSelecionados: []
      }))
    } else {
      setFormEspecifico(prev => ({
        ...prev,
        horariosSelecionados: []
      }))
    }
  }

  const handleAddHorariosRecorrentes = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formRecorrente.diasSemana.length === 0) {
      toast.error('Selecione pelo menos um dia da semana')
      return
    }

    if (formRecorrente.horariosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um horário')
      return
    }

    // Validar se todos os dias selecionados têm data
    const diasSemData = formRecorrente.diasSemana.filter(dia => !formRecorrente.datasPorDia[dia])
    if (diasSemData.length > 0) {
      const diasNomes = diasSemData.map(dia => DIAS_SEMANA.find(d => d.valor === dia)?.label).join(', ')
      toast.error(`Selecione uma data para: ${diasNomes}`)
      return
    }

    // Validar se as datas não são no passado
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    for (const diaSemana of formRecorrente.diasSemana) {
      const dataStr = formRecorrente.datasPorDia[diaSemana]
      if (dataStr) {
        const dataObj = parse(dataStr, 'yyyy-MM-dd', new Date())
        if (dataObj < hoje) {
          const diaNome = DIAS_SEMANA.find(d => d.valor === diaSemana)?.label
          toast.error(`A data selecionada para ${diaNome} não pode ser no passado`)
          return
        }
      }
    }

    try {
      const promises: Promise<any>[] = []
      
      // Para cada dia da semana selecionado
      for (const diaSemana of formRecorrente.diasSemana) {
        const dataEspecifica = formRecorrente.datasPorDia[diaSemana]
        if (!dataEspecifica) continue

        // Verificar quais horários já existem para este dia e data
        const horariosExistentes = horarios
          .filter(h => 
            h.tipo === 'recorrente' && 
            h.diaSemana === diaSemana && 
            h.data === dataEspecifica
          )
          .map(h => h.hora)

        // Adicionar apenas horários que não existem
        for (const hora of formRecorrente.horariosSelecionados) {
          if (!horariosExistentes.includes(hora)) {
            promises.push(
              addDoc(collection(db, collectionName, profissionalId, 'horarios'), {
                tipo: 'recorrente',
                diaSemana: diaSemana,
                data: dataEspecifica, // Data específica para este dia da semana
                hora: hora,
                disponivel: true,
              })
            )
          }
        }
      }

      if (promises.length === 0) {
        toast.error('Todos os horários selecionados já estão cadastrados para as datas escolhidas')
        return
      }

      await Promise.all(promises)

      toast.success(`${promises.length} horário(s) recorrente(s) adicionado(s) com sucesso!`)
      setFormRecorrente({ diasSemana: [], horariosSelecionados: [], horarioEspecifico: '', datasPorDia: {}, dataInicio: '', dataFim: '' })
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao adicionar horários recorrentes:', error)
      toast.error('Erro ao adicionar horários recorrentes')
    }
  }

  const handleAddHorariosEspecificos = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formEspecifico.data) {
      toast.error('Selecione uma data')
      return
    }

    if (formEspecifico.horariosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um horário')
      return
    }

    // Validar se não é no passado
    const dataObj = parse(formEspecifico.data, 'yyyy-MM-dd', new Date())
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (dataObj < hoje) {
      toast.error('Não é possível adicionar horários no passado')
      return
    }

    // Verificar quais horários já existem
    const horariosExistentes = horarios
      .filter(h => h.tipo === 'especifico' && h.data === formEspecifico.data)
      .map(h => h.hora)

    const horariosParaAdicionar = formEspecifico.horariosSelecionados.filter(
      hora => !horariosExistentes.includes(hora)
    )

    if (horariosParaAdicionar.length === 0) {
      toast.error('Todos os horários selecionados já estão cadastrados')
      return
    }

    if (horariosParaAdicionar.length < formEspecifico.horariosSelecionados.length) {
      toast.error(`${formEspecifico.horariosSelecionados.length - horariosParaAdicionar.length} horário(s) já existem e serão ignorados`)
    }

    try {
      // Calcular o dia da semana da data selecionada
      const dataObj = parse(formEspecifico.data, 'yyyy-MM-dd', new Date())
      const diaSemana = dataObj.getDay() // 0 = domingo, 1 = segunda, ..., 6 = sábado

      // Adicionar todos os horários de uma vez
      const promises = horariosParaAdicionar.map(hora =>
        addDoc(collection(db, collectionName, profissionalId, 'horarios'), {
          tipo: 'especifico',
          data: formEspecifico.data,
          diaSemana: diaSemana, // Adicionar o dia da semana também
          hora: hora,
          disponivel: true,
        })
      )

      await Promise.all(promises)

      toast.success(`${horariosParaAdicionar.length} horário(s) específico(s) adicionado(s) com sucesso!`)
      setFormEspecifico({ data: '', horariosSelecionados: [] })
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao adicionar horários específicos:', error)
      toast.error('Erro ao adicionar horários específicos')
    }
  }

  const handleDeleteHorario = async (horarioId: string) => {
    if (!confirm('Tem certeza que deseja remover este horário?')) return

    try {
      await deleteDoc(doc(db, collectionName, profissionalId, 'horarios', horarioId))
      toast.success('Horário removido com sucesso!')
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao remover horário:', error)
      toast.error('Erro ao remover horário')
    }
  }

  const toggleSelecaoHorario = (horarioId: string) => {
    setHorariosSelecionados(prev => 
      prev.includes(horarioId)
        ? prev.filter(id => id !== horarioId)
        : [...prev, horarioId]
    )
  }

  const selecionarTodosHorariosParaDeletar = () => {
    setHorariosSelecionados(horarios.map(h => h.id))
  }

  const deselecionarTodosHorariosParaDeletar = () => {
    setHorariosSelecionados([])
  }

  const handleDeleteMultiplos = async () => {
    if (horariosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um horário para remover')
      return
    }

    if (!confirm(`Tem certeza que deseja remover ${horariosSelecionados.length} horário(s)?`)) return

    try {
      const promises = horariosSelecionados.map(horarioId =>
        deleteDoc(doc(db, 'profissionais', profissionalId, 'horarios', horarioId))
      )
      
      await Promise.all(promises)
      toast.success(`${horariosSelecionados.length} horário(s) removido(s) com sucesso!`)
      setHorariosSelecionados([])
      setModoSelecao(false)
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao remover horários:', error)
      toast.error('Erro ao remover horários')
    }
  }

  const handleDeleteTodos = async () => {
    if (horarios.length === 0) {
      toast.error('Não há horários para remover')
      return
    }

    if (!confirm(`Tem certeza que deseja remover TODOS os ${horarios.length} horário(s)? Esta ação não pode ser desfeita.`)) return

    try {
      const promises = horarios.map(horario =>
        deleteDoc(doc(db, 'profissionais', profissionalId, 'horarios', horario.id))
      )
      
      await Promise.all(promises)
      toast.success(`Todos os ${horarios.length} horário(s) foram removidos com sucesso!`)
      setHorariosSelecionados([])
      setModoSelecao(false)
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao remover todos os horários:', error)
      toast.error('Erro ao remover todos os horários')
    }
  }

  // Agrupar horários recorrentes por dia da semana e data
  const horariosRecorrentes = horarios.filter(h => h.tipo === 'recorrente')
  const horariosRecorrentesPorDia = horariosRecorrentes.reduce((acc, horario) => {
    const dia = horario.diaSemana || 0
    const data = horario.data || 'sem-data'
    const key = `${dia}-${data}`
    if (!acc[key]) {
      acc[key] = {
        diaSemana: dia,
        data: horario.data,
        horarios: []
      }
    }
    acc[key].horarios.push(horario)
    return acc
  }, {} as Record<string, { diaSemana: number, data?: string, horarios: HorarioDisponivel[] }>)

  // Agrupar horários específicos por data
  const horariosEspecificos = horarios.filter(h => h.tipo === 'especifico')
  const horariosEspecificosPorData = horariosEspecificos.reduce((acc, horario) => {
    const data = horario.data || ''
    if (!acc[data]) {
      acc[data] = []
    }
    acc[data].push(horario)
    return acc
  }, {} as Record<string, HorarioDisponivel[]>)

  return (
    <div className="horarios-disponiveis-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Clock size={20} />
            Horários Disponíveis
          </h2>
          {profissionalNome && (
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              {profissionalNome}
            </p>
          )}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {modoSelecao ? (
              <>
                <button
                  onClick={() => {
                    if (horariosSelecionados.length === horarios.length) {
                      deselecionarTodosHorariosParaDeletar()
                    } else {
                      selecionarTodosHorariosParaDeletar()
                    }
                  }}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {horariosSelecionados.length === horarios.length ? 'Deselecionar Todos' : 'Selecionar Todos'}
                </button>
                <button
                  onClick={handleDeleteMultiplos}
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={horariosSelecionados.length === 0}
                >
                  <Trash2 size={16} />
                  Remover Selecionados ({horariosSelecionados.length})
                </button>
                <button
                  onClick={() => {
                    setModoSelecao(false)
                    setHorariosSelecionados([])
                  }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setModoSelecao(true)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Check size={16} />
                  Selecionar Múltiplos
                </button>
                {horarios.length > 0 && (
                  <button
                    onClick={handleDeleteTodos}
                    className="btn btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    title="Remover todos os horários"
                  >
                    <Trash2 size={16} />
                    Apagar Todos
                  </button>
                )}
                <button
                  onClick={() => {
                    setTipoHorario('recorrente')
                    setFormRecorrente({ diasSemana: [], horariosSelecionados: [], horarioEspecifico: '', datasPorDia: {}, dataInicio: '', dataFim: '' })
                    setFormEspecifico({ data: '', horariosSelecionados: [] })
                    setShowAddModal(true)
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={16} />
                  Adicionar Horários
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          Carregando horários...
        </div>
      ) : horarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>Nenhum horário disponível cadastrado</p>
        </div>
      ) : (
        <div className="horarios-grouped">
          {/* Horários Recorrentes */}
          {Object.keys(horariosRecorrentesPorDia).length > 0 && (
            <div className="horarios-tipo-section">
              <h3 className="tipo-header">
                <Repeat size={18} />
                Horários Recorrentes (Semanais)
              </h3>
              {Object.entries(horariosRecorrentesPorDia).map(([key, grupo]) => {
                const diaInfo = DIAS_SEMANA.find(d => d.valor === grupo.diaSemana)
                if (!diaInfo || grupo.horarios.length === 0) return null
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="horarios-data-group"
                  >
                    <h4 className="data-header">
                      {diaInfo.label}
                      {grupo.data && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                          - {format(parse(grupo.data, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </h4>
                    <div className="horarios-grid">
                      {grupo.horarios.map((horario) => (
                        <motion.div
                          key={horario.id}
                          className={`horario-chip ${!horario.disponivel ? 'indisponivel' : ''} ${modoSelecao && horariosSelecionados.includes(horario.id) ? 'selecionado' : ''}`}
                          onClick={() => modoSelecao && horario.disponivel && toggleSelecaoHorario(horario.id)}
                          style={{ cursor: modoSelecao && horario.disponivel ? 'pointer' : 'default' }}
                        >
                          {modoSelecao && horario.disponivel && (
                            <input
                              type="checkbox"
                              checked={horariosSelecionados.includes(horario.id)}
                              onChange={() => toggleSelecaoHorario(horario.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                marginRight: '0.5rem', 
                                cursor: 'pointer',
                                width: '18px',
                                height: '18px',
                                accentColor: 'var(--color-primary)'
                              }}
                            />
                          )}
                          <span>{horario.hora}</span>
                          {!readOnly && horario.disponivel && !modoSelecao && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteHorario(horario.id)
                              }}
                              className="chip-delete"
                              title="Remover horário"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Horários Específicos */}
          {Object.keys(horariosEspecificosPorData).length > 0 && (
            <div className="horarios-tipo-section" style={{ marginTop: '2rem' }}>
              <h3 className="tipo-header">
                <CalendarDays size={18} />
                Horários Específicos
              </h3>
              {Object.entries(horariosEspecificosPorData).map(([data, horariosData]) => (
                <motion.div
                  key={data}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="horarios-data-group"
                >
                  <h4 className="data-header">
                    {format(parse(data, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                  </h4>
                  <div className="horarios-grid">
                    {horariosData.map((horario) => (
                      <motion.div
                        key={horario.id}
                        className={`horario-chip ${!horario.disponivel ? 'indisponivel' : ''} ${modoSelecao && horariosSelecionados.includes(horario.id) ? 'selecionado' : ''}`}
                        onClick={() => modoSelecao && horario.disponivel && toggleSelecaoHorario(horario.id)}
                        style={{ cursor: modoSelecao && horario.disponivel ? 'pointer' : 'default' }}
                      >
                        {modoSelecao && horario.disponivel && (
                          <input
                            type="checkbox"
                            checked={horariosSelecionados.includes(horario.id)}
                            onChange={() => toggleSelecaoHorario(horario.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              marginRight: '0.5rem', 
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px',
                              accentColor: 'var(--color-primary)'
                            }}
                          />
                        )}
                        <span style={{ flex: 1 }}>{horario.hora}</span>
                        {!readOnly && horario.disponivel && !modoSelecao && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteHorario(horario.id)
                            }}
                            className="chip-delete"
                            title="Remover horário"
                            style={{ marginLeft: 'auto' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Adicionar Horários */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Adicionar Horários Disponíveis</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-icon"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {/* Seleção de Tipo */}
                <div className="form-group">
                  <label>Tipo de Horário *</label>
                  <div className="tipo-selector">
                    <button
                      type="button"
                      onClick={() => setTipoHorario('recorrente')}
                      className={`tipo-btn ${tipoHorario === 'recorrente' ? 'active' : ''}`}
                    >
                      <Repeat size={18} />
                      Recorrente (Dias da Semana)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoHorario('especifico')}
                      className={`tipo-btn ${tipoHorario === 'especifico' ? 'active' : ''}`}
                    >
                      <CalendarDays size={18} />
                      Específico (Data e Hora)
                    </button>
                  </div>
                </div>

                {/* Formulário Recorrente */}
                {tipoHorario === 'recorrente' && (
                  <form onSubmit={handleAddHorariosRecorrentes}>
                    {/* Seletor de intervalo de datas */}
                    <div className="form-group">
                      <label>Selecione o intervalo de datas *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                        <div>
                          <label htmlFor="dataInicioIntervalo" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Data Inicial
                          </label>
                          <input
                            type="date"
                            id="dataInicioIntervalo"
                            value={formRecorrente.dataInicio}
                            onChange={(e) => setFormRecorrente(prev => ({ ...prev, dataInicio: e.target.value }))}
                            className="form-input"
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
                        </div>
                        <div>
                          <label htmlFor="dataFimIntervalo" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Data Final
                          </label>
                          <input
                            type="date"
                            id="dataFimIntervalo"
                            value={formRecorrente.dataFim}
                            onChange={(e) => setFormRecorrente(prev => ({ ...prev, dataFim: e.target.value }))}
                            className="form-input"
                            min={formRecorrente.dataInicio || format(new Date(), 'yyyy-MM-dd')}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => preencherDiasPorIntervalo(formRecorrente.dataInicio, formRecorrente.dataFim)}
                        className="btn btn-secondary"
                        style={{ marginTop: '0.75rem', width: '100%' }}
                        disabled={!formRecorrente.dataInicio || !formRecorrente.dataFim}
                      >
                        <CalendarDays size={18} style={{ marginRight: '0.5rem' }} />
                        Preencher dias da semana automaticamente
                      </button>
                      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Selecione um intervalo de datas (ex: 01/12/2025 a 05/12/2025) e clique no botão para preencher automaticamente os dias da semana correspondentes.
                      </p>
                    </div>

                    {/* Exibição dos dias da semana selecionados */}
                    {formRecorrente.diasSemana.length > 0 && (
                      <div className="form-group">
                        <label>Dias da semana selecionados:</label>
                        <div className="dias-semana-grid" style={{ marginTop: '0.75rem' }}>
                          {DIAS_SEMANA.map(dia => {
                            const selecionado = formRecorrente.diasSemana.includes(dia.valor)
                            if (!selecionado) return null
                            
                            return (
                              <motion.div
                                key={dia.valor}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`dia-semana-btn selected`}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                              >
                                <Check size={16} />
                                {dia.label}
                                {formRecorrente.datasPorDia[dia.valor] && (
                                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    ({format(parse(formRecorrente.datasPorDia[dia.valor], 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })})
                                  </span>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormRecorrente(prev => ({ 
                            ...prev, 
                            diasSemana: [], 
                            datasPorDia: {}, 
                            dataInicio: '', 
                            dataFim: '' 
                          }))}
                          className="btn-link"
                          style={{ marginTop: '0.5rem' }}
                        >
                          Limpar seleção
                        </button>
                      </div>
                    )}

                    {/* Seleção de data para cada dia da semana */}
                    {formRecorrente.diasSemana.length > 0 && (
                      <div className="form-group">
                        <label>Selecione a data para cada dia da semana *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                          {formRecorrente.diasSemana.map(diaSemana => {
                            const diaInfo = DIAS_SEMANA.find(d => d.valor === diaSemana)
                            if (!diaInfo) return null
                            
                            return (
                              <div key={diaSemana} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                <label style={{ minWidth: '120px', fontWeight: 500, margin: 0 }}>
                                  {diaInfo.label}:
                                </label>
                                <input
                                  type="date"
                                  value={formRecorrente.datasPorDia[diaSemana] || ''}
                                  onChange={(e) => atualizarDataDiaSemana(diaSemana, e.target.value)}
                                  className="form-input"
                                  style={{ flex: 1, maxWidth: '200px' }}
                                  min={format(new Date(), 'yyyy-MM-dd')}
                                  required
                                />
                              </div>
                            )
                          })}
                        </div>
                        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Cada dia da semana precisa ter sua própria data específica. Exemplo: Segunda-feira = 01/12/2025, Terça-feira = 02/12/2025, etc.
                        </p>
                      </div>
                    )}

                    {formRecorrente.diasSemana.length > 0 && formRecorrente.diasSemana.every(dia => formRecorrente.datasPorDia[dia]) && (
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <label>Selecione os horários disponíveis *</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => selecionarTodosHorarios('recorrente')}
                              className="btn-link"
                            >
                              Selecionar todos
                            </button>
                            <button
                              type="button"
                              onClick={() => deselecionarTodosHorarios('recorrente')}
                              className="btn-link"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                        
                        <div className="horarios-selector-grid">
                          {HORARIOS_PADRAO.map((hora) => {
                            const selecionado = formRecorrente.horariosSelecionados.includes(hora)
                            
                            return (
                              <motion.button
                                key={hora}
                                type="button"
                                onClick={() => toggleHorario(hora, 'recorrente')}
                                className={`horario-selector-btn ${selecionado ? 'selected' : ''}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={`Selecionar ${hora}`}
                              >
                                {selecionado && <Check size={16} />}
                                {hora}
                              </motion.button>
                            )
                          })}
                        </div>

                        {/* Horários customizados adicionados */}
                        {formRecorrente.horariosSelecionados.filter(h => !HORARIOS_PADRAO.includes(h)).length > 0 && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                              Horários Específicos Adicionados:
                            </label>
                            <div className="horarios-selector-grid">
                              {formRecorrente.horariosSelecionados
                                .filter(h => !HORARIOS_PADRAO.includes(h))
                                .map((hora) => {
                                  const selecionado = formRecorrente.horariosSelecionados.includes(hora)
                                  return (
                                    <motion.button
                                      key={hora}
                                      type="button"
                                      onClick={() => toggleHorario(hora, 'recorrente')}
                                      className={`horario-selector-btn ${selecionado ? 'selected' : ''} custom-horario`}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      title={`Remover ${hora}`}
                                    >
                                      {selecionado && <Check size={16} />}
                                      {hora}
                                    </motion.button>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Campo para adicionar horário específico */}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Adicionar Horário Específico:
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="time"
                              value={formRecorrente.horarioEspecifico}
                              onChange={(e) => setFormRecorrente(prev => ({ ...prev, horarioEspecifico: e.target.value }))}
                              placeholder="HH:MM"
                              className="form-input"
                              style={{ flex: 1, maxWidth: '200px' }}
                            />
                            <button
                              type="button"
                              onClick={adicionarHorarioEspecifico}
                              className="btn btn-secondary"
                              style={{ padding: '0.75rem 1rem' }}
                            >
                              <Plus size={16} />
                              Adicionar
                            </button>
                          </div>
                          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Digite um horário específico (ex: 14:30, 15:45)
                          </p>
                        </div>
                        
                        {formRecorrente.horariosSelecionados.length > 0 && (
                          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {formRecorrente.horariosSelecionados.length} horário(s) selecionado(s) para {formRecorrente.diasSemana.length} dia(s)
                          </p>
                        )}
                      </div>
                    )}

                    <div className="modal-actions">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="btn btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={formRecorrente.diasSemana.length === 0 || formRecorrente.horariosSelecionados.length === 0 || !formRecorrente.diasSemana.every(dia => formRecorrente.datasPorDia[dia])}
                      >
                        Adicionar {formRecorrente.horariosSelecionados.length > 0 && formRecorrente.diasSemana.length > 0 && `(${formRecorrente.horariosSelecionados.length * formRecorrente.diasSemana.length})`}
                      </button>
                    </div>
                  </form>
                )}

                {/* Formulário Específico */}
                {tipoHorario === 'especifico' && (
                  <form onSubmit={handleAddHorariosEspecificos}>
                    <div className="form-group">
                      <label htmlFor="data">Data *</label>
                      <input
                        type="date"
                        id="data"
                        value={formEspecifico.data}
                        onChange={(e) => setFormEspecifico({ ...formEspecifico, data: e.target.value })}
                        required
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="form-input"
                      />
                    </div>

                    {formEspecifico.data && (
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <label>Selecione os horários disponíveis *</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => selecionarTodosHorarios('especifico')}
                              className="btn-link"
                            >
                              Selecionar todos
                            </button>
                            <button
                              type="button"
                              onClick={() => deselecionarTodosHorarios('especifico')}
                              className="btn-link"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                        
                        <div className="horarios-selector-grid">
                          {HORARIOS_PADRAO.map((hora) => {
                            const jaExiste = horarios.some(
                              h => h.tipo === 'especifico' && h.data === formEspecifico.data && h.hora === hora
                            )
                            const selecionado = formEspecifico.horariosSelecionados.includes(hora)
                            
                            return (
                              <motion.button
                                key={hora}
                                type="button"
                                onClick={() => !jaExiste && toggleHorario(hora, 'especifico')}
                                disabled={jaExiste}
                                className={`horario-selector-btn ${selecionado ? 'selected' : ''} ${jaExiste ? 'disabled' : ''}`}
                                whileHover={!jaExiste ? { scale: 1.05 } : {}}
                                whileTap={!jaExiste ? { scale: 0.95 } : {}}
                                title={jaExiste ? 'Horário já cadastrado' : `Selecionar ${hora}`}
                              >
                                {selecionado && <Check size={16} />}
                                {hora}
                                {jaExiste && <span className="exists-badge">✓</span>}
                              </motion.button>
                            )
                          })}
                        </div>
                        
                        {formEspecifico.horariosSelecionados.length > 0 && (
                          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {formEspecifico.horariosSelecionados.length} horário(s) selecionado(s)
                          </p>
                        )}
                      </div>
                    )}

                    <div className="modal-actions">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="btn btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={!formEspecifico.data || formEspecifico.horariosSelecionados.length === 0}
                      >
                        Adicionar {formEspecifico.horariosSelecionados.length > 0 && `(${formEspecifico.horariosSelecionados.length})`}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .horarios-disponiveis-section {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-md);
        }

        .horarios-grouped {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .horarios-tipo-section {
          margin-bottom: 1.5rem;
        }

        .tipo-header {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--color-primary);
        }

        .horarios-data-group {
          background: var(--color-background);
          border-radius: var(--radius-md);
          padding: 1rem;
          border: 1px solid var(--color-border);
          margin-bottom: 1rem;
        }

        .data-header {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--color-primary);
        }

        .horarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.5rem;
        }

        .horario-chip.selecionado {
          background: rgba(var(--color-primary-rgb), 0.15);
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
        }

        .horario-chip {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.875rem;
          transition: all var(--transition-base);
          position: relative;
        }

        .horario-chip input[type="checkbox"] {
          flex-shrink: 0;
          margin: 0;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .horario-chip:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .horario-chip.indisponivel {
          opacity: 0.5;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 2px solid #ef4444;
          color: #991b1b;
          cursor: not-allowed;
          position: relative;
        }

        .horario-chip.indisponivel::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background: #ef4444;
          transform: translateY(-50%);
        }

        .horario-chip.indisponivel:hover {
          border-color: #ef4444;
          box-shadow: none;
        }

        .chip-delete {
          background: none;
          border: none;
          color: var(--color-error);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          transition: all var(--transition-base);
        }

        .chip-delete:hover {
          background: rgba(var(--color-error-rgb), 0.1);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          background: var(--color-surface);
          z-index: 10;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-muted);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-base);
        }

        .btn-icon:hover {
          background: var(--color-surface);
          color: var(--color-text);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: all var(--transition-base);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
        }

        .tipo-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .tipo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          color: var(--color-text);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .tipo-btn:hover {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.05);
        }

        .tipo-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .dias-semana-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .dia-semana-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .dia-semana-btn:hover {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.05);
        }

        .dia-semana-btn.selected {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .btn-link {
          background: none;
          border: none;
          color: var(--color-primary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-base);
        }

        .btn-link:hover {
          background: rgba(var(--color-primary-rgb), 0.1);
        }

        .horarios-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 0.5rem;
        }

        .horario-selector-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-background);
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-base);
          position: relative;
        }

        .horario-selector-btn:hover:not(.disabled) {
          border-color: var(--color-primary);
          background: rgba(var(--color-primary-rgb), 0.05);
        }

        .horario-selector-btn.selected {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .horario-selector-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--color-surface);
        }

        .horario-selector-btn.custom-horario {
          border-style: dashed;
        }

        .horario-selector-btn.custom-horario.selected {
          border-style: solid;
        }

        .exists-badge {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          font-size: 0.75rem;
          color: var(--color-success);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-dark);
          box-shadow: var(--shadow-md);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--color-background);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }

        .btn-secondary:hover {
          background: var(--color-surface);
        }

        .btn-outline {
          background: transparent;
          color: var(--color-primary);
          border: 2px solid var(--color-primary);
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all var(--transition-base);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-outline:hover {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .btn-outline:active {
          transform: translateY(0);
        }

        .btn-danger {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all var(--transition-base);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
        }

        .btn-danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #c82333, #bd2130);
          box-shadow: 0 4px 16px rgba(220, 53, 69, 0.4);
          transform: translateY(-2px);
        }

        .btn-danger:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  )
}
