# 🚀 Medify Mobile Backend

Backend Node.js para o aplicativo mobile Medify.

## 📋 Requisitos

- Node.js 18+ 
- Firebase Project configurado
- Firebase Admin SDK credentials

## 🛠️ Instalação

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente:
```bash
cp .env.example .env
```

3. Editar `.env` com suas credenciais do Firebase:
```env
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="sua-private-key"
FIREBASE_CLIENT_EMAIL=seu-client-email
PORT=3001
JWT_SECRET=sua-chave-secreta
```

## 🚀 Executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com coverage
npm run test:coverage
```

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Cadastro
- `GET /api/auth/verify` - Verificar token

### Paciente
- `GET /api/paciente/dashboard` - Dashboard
- `POST /api/paciente/consultas` - Agendar consulta
- `GET /api/paciente/consultas` - Histórico de consultas
- `GET /api/paciente/consultas/:id` - Detalhes da consulta
- `GET /api/paciente/perfil` - Ver perfil
- `PUT /api/paciente/perfil` - Atualizar perfil

### Profissional
- `GET /api/profissional/dashboard` - Dashboard
- `GET /api/profissional/consultas` - Listar consultas
- `GET /api/profissional/consultas/:id` - Detalhes da consulta
- `PATCH /api/profissional/consultas/:id/status` - Atualizar status
- `GET /api/profissional/prontuarios/:idPaciente` - Ver prontuário
- `POST /api/profissional/prontuarios/:idPaciente/observacoes` - Adicionar observação
- `GET /api/profissional/perfil` - Ver perfil
- `PUT /api/profissional/perfil` - Atualizar perfil

### Admin
- `GET /api/admin/dashboard` - Dashboard
- `GET /api/admin/clinicas` - Listar clínicas
- `POST /api/admin/clinicas` - Criar clínica
- `PUT /api/admin/clinicas/:id` - Atualizar clínica
- `GET /api/admin/profissionais` - Listar profissionais
- `POST /api/admin/profissionais` - Criar profissional
- `PUT /api/admin/profissionais/:id` - Atualizar profissional

## 🔒 Autenticação

Todas as rotas (exceto `/api/auth/*`) requerem autenticação via Bearer Token:

```
Authorization: Bearer <token>
```

## 📝 Estrutura do Projeto

```
src/
├── config/          # Configurações (Firebase, constants)
├── controllers/     # Lógica de negócio
├── middleware/      # Middlewares (auth, error handling)
├── routes/          # Definição de rotas
├── utils/           # Utilitários (validators, response)
└── server.js        # Entry point
```

## 🧪 Testes

Os testes estão organizados em `__tests__/` seguindo a mesma estrutura do código.

