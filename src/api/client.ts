// Cliente API para comunicação com o backend Django
// Configuração para usar Firebase diretamente OU backend Django

const API_BASE_URL = 'http://localhost:8000/api' // Ajustar se necessário

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        return {
          success: false,
          error: error.message || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro na requisição',
      }
    }
  }

  // Consultas
  async getConsultas(userId?: string, profile?: string) {
    return this.request(`/consultas/?user_id=${userId}&profile=${profile}`)
  }

  async createConsulta(data: any) {
    return this.request('/consultas/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateConsulta(id: string, data: any) {
    return this.request(`/consultas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteConsulta(id: string) {
    return this.request(`/consultas/${id}/`, {
      method: 'DELETE',
    })
  }

  // Prontuários
  async getProntuarios(pacienteId?: string, profissionalId?: string) {
    const params = new URLSearchParams()
    if (pacienteId) params.append('paciente_id', pacienteId)
    if (profissionalId) params.append('profissional_id', profissionalId)
    return this.request(`/prontuarios/?${params.toString()}`)
  }

  async createProntuario(data: any) {
    return this.request('/prontuarios/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProntuario(id: string, data: any) {
    return this.request(`/prontuarios/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Funcionários
  async getFuncionarios(clinicaId: string) {
    return this.request(`/funcionarios/?clinica_id=${clinicaId}`)
  }

  async createFuncionario(clinicaId: string, data: any) {
    return this.request('/funcionarios/', {
      method: 'POST',
      body: JSON.stringify({ ...data, clinica_id: clinicaId }),
    })
  }

  async updateFuncionario(id: string, data: any) {
    return this.request(`/funcionarios/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteFuncionario(id: string) {
    return this.request(`/funcionarios/${id}/`, {
      method: 'DELETE',
    })
  }

  // Pacientes
  async getPacientes(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return this.request(`/pacientes/${params}`)
  }

  async getPaciente(id: string) {
    return this.request(`/pacientes/${id}/`)
  }

  // Profissionais
  async getProfissionais(clinicaId?: string) {
    const params = clinicaId ? `?clinica_id=${clinicaId}` : ''
    return this.request(`/profissionais/${params}`)
  }

  async getProfissional(id: string) {
    return this.request(`/profissionais/${id}/`)
  }

  // Clínicas
  async getClinica(id: string) {
    return this.request(`/clinicas/${id}/`)
  }

  async updateClinica(id: string, data: any) {
    return this.request(`/clinicas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }
}

// Instância padrão usando Firebase diretamente (modo atual)
// Se quiser usar Django, descomente e configure
export const apiClient = new ApiClient()

// Para usar Firebase diretamente (padrão atual), não precisamos do Django
// Mas deixamos a estrutura pronta caso queira migrar depois
export default apiClient

