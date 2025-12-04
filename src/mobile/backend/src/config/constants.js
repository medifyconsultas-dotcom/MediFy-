// Perfis de usuário
export const USER_PROFILES = {
  PACIENTE: 'paciente',
  PROFISSIONAL: 'profissional',
  ADMIN: 'admin',
};

// Status de consultas
export const CONSULTA_STATUS = {
  AGENDADA: 'agendada',
  CONFIRMADA: 'confirmada',
  REALIZADA: 'realizada',
  CANCELADA: 'cancelada',
};

// Collections do Firestore
export const COLLECTIONS = {
  USERS: 'users',
  PACIENTES: 'pacientes',
  PROFISSIONAIS: 'profissionais',
  CLINICAS: 'clinicas',
  FUNCIONARIOS: 'funcionarios',
  CONSULTAS: 'consultas',
  CONSULTAS_AUTONOMOS: 'consultas_autonomos',
  PRONTUARIOS: 'prontuarios',
};

// Mensagens de erro
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Não autorizado',
  FORBIDDEN: 'Acesso negado',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Erro de validação',
  INTERNAL_ERROR: 'Erro interno do servidor',
  USER_NOT_FOUND: 'Usuário não encontrado',
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  EMAIL_ALREADY_EXISTS: 'Email já cadastrado',
};

// Mensagens de sucesso
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login realizado com sucesso',
  REGISTER_SUCCESS: 'Cadastro realizado com sucesso',
  UPDATE_SUCCESS: 'Atualizado com sucesso',
  DELETE_SUCCESS: 'Excluído com sucesso',
  CREATE_SUCCESS: 'Criado com sucesso',
};

