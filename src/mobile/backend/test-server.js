// Script de teste do servidor sem Firebase
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor de teste funcionando!',
    timestamp: new Date().toISOString(),
  });
});

// Teste de rotas
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend está funcionando!',
    routes: {
      auth: '/api/auth',
      paciente: '/api/paciente',
      profissional: '/api/profissional',
      admin: '/api/admin',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test: http://localhost:${PORT}/test`);
  console.log('\n✅ Backend configurado corretamente!');
  console.log('⚠️  Para usar com Firebase, configure o arquivo .env');
});
