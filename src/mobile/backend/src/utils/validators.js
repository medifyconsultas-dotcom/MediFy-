import Joi from 'joi';

// Validação de login
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
});

// Validação de cadastro
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
  nome: Joi.string().min(2).required().messages({
    'string.min': 'Nome deve ter no mínimo 2 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  perfil: Joi.string().valid('paciente', 'profissional', 'admin').required().messages({
    'any.only': 'Perfil inválido',
    'any.required': 'Perfil é obrigatório',
  }),
  telefone: Joi.string().optional(),
  cpf: Joi.string().optional(),
  dataNascimento: Joi.date().optional(),
  endereco: Joi.string().optional().allow(null, ''),
  planoSaude: Joi.string().optional().allow(null, ''),
});

// Validação de agendamento
export const agendamentoSchema = Joi.object({
  idClinica: Joi.string().optional().allow(null),
  idProfissional: Joi.string().required().messages({
    'any.required': 'Profissional é obrigatório',
  }),
  dataConsulta: Joi.date().required().messages({
    'any.required': 'Data da consulta é obrigatória',
    'date.base': 'Data inválida',
  }),
  observacoes: Joi.string().optional().allow(''),
});

// Validação de atualização de perfil
export const updateProfileSchema = Joi.object({
  nome: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  telefone: Joi.string().optional().allow('', null),
  cpf: Joi.string().optional().allow('', null),
  dataNascimento: Joi.alternatives().try(
    Joi.date(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
  ).optional().allow('', null),
  especialidade: Joi.string().optional().allow('', null),
  crm: Joi.string().optional().allow('', null),
  bio: Joi.string().optional().allow('', null),
  descricao: Joi.string().optional().allow('', null),
  valorConsulta: Joi.string().optional().allow('', null),
  fotoPerfil: Joi.string().max(10000000).optional().allow('', null), // Aceitar base64 (pode ser grande)
  foto: Joi.string().max(10000000).optional().allow('', null), // Aceitar base64 (pode ser grande)
  fotoURL: Joi.string().max(10000000).optional().allow('', null), // Aceitar base64 (pode ser grande)
  notificacoes: Joi.boolean().optional(),
  marketing: Joi.boolean().optional(),
  marketingEmails: Joi.boolean().optional(),
  endereco: Joi.alternatives().try(
    Joi.string().allow('', null),
    Joi.object({
      rua: Joi.string().optional(),
      numero: Joi.string().optional(),
      bairro: Joi.string().optional(),
      cidade: Joi.string().optional(),
      estado: Joi.string().optional(),
      cep: Joi.string().optional(),
    })
  ).optional().allow('', null),
  plano: Joi.string().optional().allow('', null),
  planoSaude: Joi.string().optional().allow('', null),
});

// Validação de observações no prontuário
export const observacaoSchema = Joi.object({
  observacao: Joi.string().required().messages({
    'any.required': 'Observação é obrigatória',
  }),
});

// Validação de criação de consulta
export const createConsultaSchema = Joi.object({
  idPaciente: Joi.string().required().messages({
    'any.required': 'Paciente é obrigatório',
  }),
  dataConsulta: Joi.string().required().messages({
    'any.required': 'Data da consulta é obrigatória',
  }),
  horaConsulta: Joi.string().required().messages({
    'any.required': 'Hora da consulta é obrigatória',
  }),
  status: Joi.string().valid('agendada', 'confirmada', 'realizada', 'cancelada', 'nao_compareceu').optional(),
  observacoes: Joi.string().optional().allow(''),
});

// Validação de criação de prontuário completo
export const createProntuarioSchema = Joi.object({
  idPaciente: Joi.string().required().messages({
    'any.required': 'Paciente é obrigatório',
  }),
  titulo: Joi.string().optional().allow('', null),
  conteudo: Joi.string().optional().allow('', null),
  anamnese: Joi.string().optional().allow('', null),
  exame_fisico: Joi.string().optional().allow('', null),
  sinais_vitais: Joi.string().optional().allow('', null),
  diagnosticos: Joi.string().optional().allow('', null),
  prescricoes: Joi.string().optional().allow('', null),
  medicamentos: Joi.string().optional().allow('', null),
  alergias: Joi.string().optional().allow('', null),
  antecedentes: Joi.string().optional().allow('', null),
  exames_solicitados: Joi.string().optional().allow('', null),
  plano: Joi.string().optional().allow('', null),
  follow_up: Joi.string().optional().allow('', null),
  observacoes: Joi.string().optional().allow('', null),
});

// Validação de atualização de prontuário completo
export const updateProntuarioSchema = Joi.object({
  titulo: Joi.string().optional().allow('', null),
  conteudo: Joi.string().optional().allow('', null),
  anamnese: Joi.string().optional().allow('', null),
  exame_fisico: Joi.string().optional().allow('', null),
  sinais_vitais: Joi.string().optional().allow('', null),
  diagnosticos: Joi.string().optional().allow('', null),
  prescricoes: Joi.string().optional().allow('', null),
  medicamentos: Joi.string().optional().allow('', null),
  alergias: Joi.string().optional().allow('', null),
  antecedentes: Joi.string().optional().allow('', null),
  exames_solicitados: Joi.string().optional().allow('', null),
  plano: Joi.string().optional().allow('', null),
  follow_up: Joi.string().optional().allow('', null),
  observacoes: Joi.string().optional().allow('', null),
  historico: Joi.array().items(
    Joi.object({
      data: Joi.date().optional(),
      profissional: Joi.string().optional(),
      observacao: Joi.string().optional(),
    })
  ).optional(),
});

// Middleware de validação
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Erro de validação',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      req.validatedData = value;
      next();
    } catch (err) {
      console.error('Erro no middleware de validação:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: err.message,
      });
    }
  };
};

