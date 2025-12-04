// Versão do server para testes que não inicializa o servidor HTTP
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar ambiente de teste ANTES de importar outras coisas
process.env.NODE_ENV = 'test';

dotenv.config();

// Mock do Firebase antes de importar rotas
import './config/firebase.test.js';

import authRoutes from './routes/authRoutes.js';
import pacienteRoutes from './routes/pacienteRoutes.js';
import profissionalRoutes from './routes/profissionalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/profissional', profissionalRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
