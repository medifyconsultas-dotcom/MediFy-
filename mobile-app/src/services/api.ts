import { API_BASE_URL } from '../api/config';

// Armazenar token do usuário
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Função auxiliar para fazer requisições
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erro na requisição');
    }

    return data;
  } catch (error: any) {
    console.error(`Erro na requisição ${endpoint}:`, error);
    throw error;
  }
};

// ==================== AUTENTICAÇÃO ====================
export const authAPI = {
  login: async (email: string, password: string) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData: any) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  verifyToken: async () => {
    return apiRequest('/api/auth/verify');
  },
};

// ==================== PACIENTE ====================
export const pacienteAPI = {
  // Dashboard
  getDashboard: async () => {
    return apiRequest('/api/paciente/dashboard');
  },

  // Consultas
  getConsultas: async (page: number = 1, limit: number = 10) => {
    return apiRequest(`/api/paciente/consultas?page=${page}&limit=${limit}`);
  },

  getConsultaDetalhes: async (id: string) => {
    return apiRequest(`/api/paciente/consultas/${id}`);
  },

  agendarConsulta: async (consultaData: {
    idClinica?: string | null;
    idProfissional: string;
    dataConsulta: string;
    observacoes?: string;
  }) => {
    return apiRequest('/api/paciente/consultas', {
      method: 'POST',
      body: JSON.stringify(consultaData),
    });
  },

  remarcarConsulta: async (id: string, novaData: string) => {
    return apiRequest(`/api/paciente/consultas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ dataConsulta: novaData }),
    });
  },

  cancelarConsulta: async (id: string, motivo?: string) => {
    return apiRequest(`/api/paciente/consultas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ motivo }),
    });
  },

  // Perfil
  getPerfil: async () => {
    return apiRequest('/api/paciente/perfil');
  },

  updatePerfil: async (perfilData: any) => {
    return apiRequest('/api/paciente/perfil', {
      method: 'PUT',
      body: JSON.stringify(perfilData),
    });
  },

  // Horários disponíveis
  getHorariosDisponiveis: async (profissionalId: string, data: string) => {
    return apiRequest(`/api/paciente/horarios-disponiveis/${profissionalId}?data=${data}`);
  },
};

// ==================== PROFISSIONAL ====================
export const profissionalAPI = {
  // Dashboard
  getDashboard: async () => {
    return apiRequest('/api/profissional/dashboard');
  },

  // Consultas
  getConsultas: async (page: number = 1, limit: number = 10, status?: string) => {
    let endpoint = `/api/profissional/consultas?page=${page}&limit=${limit}`;
    if (status) endpoint += `&status=${status}`;
    return apiRequest(endpoint);
  },

  getConsultaDetalhes: async (id: string) => {
    return apiRequest(`/api/profissional/consultas/${id}`);
  },

  createConsulta: async (consultaData: {
    idPaciente: string;
    dataConsulta: string;
    horaConsulta: string;
    status?: string;
    observacoes?: string;
  }) => {
    return apiRequest('/api/profissional/consultas', {
      method: 'POST',
      body: JSON.stringify(consultaData),
    });
  },

  updateStatusConsulta: async (id: string, status: string) => {
    return apiRequest(`/api/profissional/consultas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Prontuários
  getProntuarios: async (page: number = 1, limit: number = 10) => {
    return apiRequest(`/api/profissional/prontuarios?page=${page}&limit=${limit}`);
  },

  getProntuario: async (idPaciente: string) => {
    return apiRequest(`/api/profissional/prontuarios/${idPaciente}`);
  },

  createProntuario: async (prontuarioData: {
    idPaciente: string;
    titulo?: string;
    conteudo?: string;
    anamnese?: string;
    exame_fisico?: string;
    sinais_vitais?: string;
    diagnosticos?: string;
    prescricoes?: string;
    medicamentos?: string;
    alergias?: string;
    antecedentes?: string;
    exames_solicitados?: string;
    plano?: string;
    follow_up?: string;
    observacoes?: string;
  }) => {
    return apiRequest('/api/profissional/prontuarios', {
      method: 'POST',
      body: JSON.stringify(prontuarioData),
    });
  },

  updateProntuario: async (idPaciente: string, prontuarioData: {
    titulo?: string;
    conteudo?: string;
    anamnese?: string;
    exame_fisico?: string;
    sinais_vitais?: string;
    diagnosticos?: string;
    prescricoes?: string;
    medicamentos?: string;
    alergias?: string;
    antecedentes?: string;
    exames_solicitados?: string;
    plano?: string;
    follow_up?: string;
    observacoes?: string;
    historico?: Array<{
      data: Date | string;
      profissional: string;
      observacao: string;
    }>;
  }) => {
    return apiRequest(`/api/profissional/prontuarios/${idPaciente}`, {
      method: 'PUT',
      body: JSON.stringify(prontuarioData),
    });
  },

  addObservacao: async (idPaciente: string, observacao: string) => {
    return apiRequest(`/api/profissional/prontuarios/${idPaciente}/observacoes`, {
      method: 'POST',
      body: JSON.stringify({ observacao }),
    });
  },

  // Pacientes
  getPacientes: async () => {
    return apiRequest('/api/profissional/pacientes');
  },

  // Horários disponíveis
  getHorariosDisponiveis: async (data: string) => {
    return apiRequest(`/api/profissional/horarios-disponiveis?data=${data}`);
  },

  // Perfil
  getPerfil: async () => {
    return apiRequest('/api/profissional/perfil');
  },

  updatePerfil: async (perfilData: any) => {
    return apiRequest('/api/profissional/perfil', {
      method: 'PUT',
      body: JSON.stringify(perfilData),
    });
  },
};

// ==================== BUSCAR PROFISSIONAIS E CLÍNICAS ====================
export const buscaAPI = {
  getProfissionais: async (searchQuery?: string) => {
    return apiRequest('/api/paciente/profissionais' + (searchQuery ? `?search=${searchQuery}` : ''));
  },

  getClinicas: async () => {
    return apiRequest('/api/paciente/clinicas');
  },

  getMedicosClinica: async (clinicaId: string) => {
    return apiRequest(`/api/paciente/clinicas/${clinicaId}/medicos`);
  },
};

