// Utilitários para exportação de dados

export interface ExportData {
  [key: string]: any
}

/**
 * Exporta dados para JSON
 */
export function exportToJSON(data: ExportData[], filename: string = 'export') {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Converte dados para CSV
 */
function convertToCSV(data: ExportData[]): string {
  if (data.length === 0) return ''

  // Obter todas as chaves únicas
  const keys = new Set<string>()
  data.forEach(item => {
    Object.keys(item).forEach(key => keys.add(key))
  })
  const headers = Array.from(keys)

  // Criar linha de cabeçalho
  const headerRow = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')

  // Criar linhas de dados
  const dataRows = data.map(item => {
    return headers.map(header => {
      const value = item[header]
      if (value === null || value === undefined) return '""'
      if (typeof value === 'object') {
        // Se for um objeto ou array, converter para JSON string
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }
      return `"${String(value).replace(/"/g, '""').replace(/\n/g, ' ')}"`
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: ExportData[], filename: string = 'export') {
  const csv = convertToCSV(data)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM para Excel
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta dados para Excel (XLSX) usando formato CSV com extensão .xlsx
 * Nota: Para verdadeiro XLSX, seria necessário uma biblioteca como xlsx
 * Esta função cria um CSV que pode ser aberto no Excel
 */
export function exportToExcel(data: ExportData[], filename: string = 'export') {
  // Usar CSV com extensão .xlsx - Excel abrirá corretamente
  const csv = convertToCSV(data)
  const blob = new Blob(['\ufeff' + csv], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Prepara dados de consultas para exportação
 */
export function prepareConsultasForExport(consultas: any[]) {
  return consultas.map(c => ({
    'ID': c.id,
    'Paciente': c.nomePaciente,
    'Profissional': c.nomeProfissional,
    'Data Consulta': c.dataConsulta ? new Date(c.dataConsulta).toLocaleString('pt-BR') : '',
    'Status': c.status,
    'Observações': c.observacoes || '',
    'Data Criação': c.dataCriacao ? new Date(c.dataCriacao).toLocaleString('pt-BR') : '',
  }))
}

/**
 * Prepara dados de prontuários para exportação
 */
export function prepareProntuariosForExport(prontuarios: any[]) {
  return prontuarios.map(p => ({
    'ID': p.id,
    'Paciente': p.nomePaciente,
    'Profissional': p.nomeProfissional,
    'Observações': p.observacoes || '',
    'Histórico (Total)': p.historico?.length || 0,
    'Data Registro': p.dataRegistro ? new Date(p.dataRegistro).toLocaleString('pt-BR') : '',
    'Data Atualização': p.dataAtualizacao ? new Date(p.dataAtualizacao).toLocaleString('pt-BR') : '',
    'Histórico Completo': p.historico?.map((h: any) => 
      `${new Date(h.data).toLocaleString('pt-BR')} - ${h.profissional}: ${h.observacao}`
    ).join(' | ') || '',
  }))
}

