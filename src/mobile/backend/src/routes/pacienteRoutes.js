import express from 'express';
import {
  getDashboard,
  agendarConsulta,
  getHistorico,
  getConsultaDetalhes,
  updatePerfil,
  getPerfil,
  updateConsulta,
  deleteConsulta,
  uploadConsulta,
  getProfissionais,
  getClinicas,
  getHorariosDisponiveisProfissional,
  getMedicosClinica,
} from '../controllers/pacienteController.js';
import { authenticate, requireProfile } from '../middleware/auth.js';
import { validate } from '../utils/validators.js';
import { agendamentoSchema, updateProfileSchema } from '../utils/validators.js';
import { USER_PROFILES } from '../config/constants.js';

const router = express.Router();

// Todas as rotas requerem autenticação e perfil de paciente
router.use(authenticate);
router.use(requireProfile(USER_PROFILES.PACIENTE));

// Dashboard
router.get('/dashboard', getDashboard);

// Agendamento
router.post('/consultas', validate(agendamentoSchema), agendarConsulta);

// Remarcar / deletar / upload
router.patch('/consultas/:id', updateConsulta);
router.delete('/consultas/:id', deleteConsulta);
router.post('/consultas/:id/upload', uploadConsulta);

// Histórico
router.get('/consultas', getHistorico);
router.get('/consultas/:id', getConsultaDetalhes);

// Perfil
router.get('/perfil', getPerfil);
router.put('/perfil', validate(updateProfileSchema), updatePerfil);

// Buscar profissionais e clínicas
router.get('/profissionais', getProfissionais);
router.get('/clinicas', getClinicas);
router.get('/clinicas/:clinicaId/medicos', getMedicosClinica);

// Horários disponíveis de um profissional
router.get('/horarios-disponiveis/:profissionalId', getHorariosDisponiveisProfissional);

export default router;

