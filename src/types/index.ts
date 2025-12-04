export type UserProfile = 
  | 'paciente'
  | 'profissional'
  | 'clinica'
  | 'recepcionista'
  | 'medico'
  | 'admin'

export interface BaseUser {
  id: string
  email: string
  nome: string
  telefone?: string
  fotoURL?: string
  dataCriacao: Date
  perfil: UserProfile
  tema?: 'light' | 'dark'
}

export interface Paciente extends BaseUser {
  perfil: 'paciente'
  dataNascimento?: Date
  cpf?: string
  endereco?: string
  plano?: string
}

export interface Profissional extends BaseUser {
  perfil: 'profissional'
  especialidade?: string
  crm?: string
  cpfCnpj?: string
  idClinica?: string
}

export interface Clinica extends BaseUser {
  perfil: 'clinica'
  nomeFantasia: string
  cnpj?: string
  endereco?: string
}

export interface Funcionario extends BaseUser {
  perfil: 'recepcionista' | 'medico'
  cargo: 'recepcionista' | 'medico'
  idClinica: string
  especialidade?: string
}

export type User = Paciente | Profissional | Clinica | Funcionario

export interface Consulta {
  id: string
  idPaciente: string
  nomePaciente: string
  idProfissional: string
  nomeProfissional: string
  idClinica?: string
  dataConsulta: Date
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada' | 'nao_compareceu'
  observacoes?: string
  dataCriacao: Date
}

export interface Prontuario {
  id: string
  idPaciente: string
  nomePaciente: string
  dataNascimento?: Date
  telefone?: string
  cpf?: string
  idProfissional?: string
  nomeProfissional?: string
  observacoes: string
  historico: Array<{
    data: Date
    profissional: string
    observacao: string
  }>
  dataRegistro: Date
  dataAtualizacao: Date
}

