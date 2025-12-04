import express from 'express';
import {
  getDashboard,
  listClinicas,
  createClinica,
  updateClinica,
  listProfissionais,
  createProfissional,
  updateProfissional,
} from '../controllers/adminController.js';
import { authenticate, requireProfile } from '../middleware/auth.js';
import { USER_PROFILES } from '../config/constants.js';

const router = express.Router();

// Todas as rotas requerem autenticação e perfil de admin
router.use(authenticate);
router.use(requireProfile(USER_PROFILES.ADMIN));

// Dashboard
router.get('/dashboard', getDashboard);

// Gestão de Clínicas
router.get('/clinicas', listClinicas);
router.post('/clinicas', createClinica);
router.put('/clinicas/:id', updateClinica);

// Gestão de Profissionais
router.get('/profissionais', listProfissionais);
router.post('/profissionais', createProfissional);
router.put('/profissionais/:id', updateProfissional);

export default router;

