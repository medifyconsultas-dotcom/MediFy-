import express from 'express';
import { login, register, verifyToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../utils/validators.js';
import { loginSchema, registerSchema } from '../utils/validators.js';

const router = express.Router();

// Wrapper para capturar erros assíncronos
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Login
router.post('/login', validate(loginSchema), asyncHandler(login));

// Cadastro
router.post('/register', validate(registerSchema), asyncHandler(register));

// Verificar token
router.get('/verify', authenticate, asyncHandler(verifyToken));

export default router;

