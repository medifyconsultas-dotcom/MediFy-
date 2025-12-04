import express from 'express';
import {
  getDashboard,
  getConsultas,
  getConsultaDetalhes,
  getProntuario,
  addObservacao,
  updateStatusConsulta,
  updatePerfil,
  getPerfil,
  createConsulta,
  createProntuario,
  getProntuarios,
  getPacientes,
  updateProntuario,
  getHorariosDisponiveis,
} from '../controllers/profissionalController.js';
import { authenticate, requireProfile } from '../middleware/auth.js';
import { validate } from '../utils/validators.js';
import { updateProfileSchema, observacaoSchema, createConsultaSchema, createProntuarioSchema, updateProntuarioSchema } from '../utils/validators.js';
import { USER_PROFILES } from '../config/constants.js';

const router = express.Router();

// Todas as rotas requerem autenticação e perfil de profissional
router.use(authenticate);
router.use(requireProfile(USER_PROFILES.PROFISSIONAL));

// Dashboard
router.get('/dashboard', getDashboard);

// Consultas
router.get('/consultas', getConsultas);
router.get('/consultas/:id', getConsultaDetalhes);
router.post('/consultas', validate(createConsultaSchema), createConsulta);
router.patch('/consultas/:id/status', updateStatusConsulta);

// Prontuários
router.get('/prontuarios', getProntuarios);
router.get('/prontuarios/:idPaciente', getProntuario);
router.post('/prontuarios', validate(createProntuarioSchema), createProntuario);
router.put('/prontuarios/:idPaciente', validate(updateProntuarioSchema), updateProntuario);
router.post('/prontuarios/:idPaciente/observacoes', validate(observacaoSchema), addObservacao);

// Pacientes
router.get('/pacientes', getPacientes);

// Horários disponíveis
router.get('/horarios-disponiveis', getHorariosDisponiveis);

// Perfil
router.get('/perfil', getPerfil);
router.put('/perfil', validate(updateProfileSchema), updatePerfil);

export default router;

