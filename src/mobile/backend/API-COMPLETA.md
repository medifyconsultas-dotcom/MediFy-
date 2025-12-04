# 📱 API Completa - Backend Mobile Medify

## ✅ Status: PRONTO PARA INTEGRAÇÃO COM FRONTEND

## 🔗 Base URL
```
http://localhost:3001/api
```

---

## 🔑 AUTENTICAÇÃO

### POST `/api/auth/login`
**Login de usuário**

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "custom-token-123",
    "user": {
      "uid": "user-uid",
      "email": "usuario@example.com",
      "nome": "Nome do Usuário",
      "perfil": "paciente"
    }
  }
}
```

---

### POST `/api/auth/register`
**Cadastro de novo usuário**

**Body:**
```json
{
  "email": "novo@example.com",
  "password": "123456",
  "nome": "Novo Usuário",
  "perfil": "paciente",
  "telefone": "123456789",
  "cpf": "12345678900",
  "dataNascimento": "1990-01-01"
}
```

**Perfis válidos:** `paciente`, `profissional`, `admin`

**Response (201):**
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso",
  "data": {
    "token": "custom-token-123",
    "user": {
      "uid": "new-uid",
      "email": "novo@example.com",
      "nome": "Novo Usuário",
      "perfil": "paciente"
    }
  }
}
```

---

### GET `/api/auth/verify`
**Verificar token e obter dados do usuário**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token válido",
  "data": {
    "uid": "user-uid",
    "email": "usuario@example.com",
    "nome": "Nome do Usuário",
    "perfil": "paciente"
  }
}
```

---

## 👤 PACIENTE

**Todas as rotas requerem:** `Authorization: Bearer <token>`

### GET `/api/paciente/dashboard`
**Dashboard do paciente**

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard carregado com sucesso",
  "data": {
    "consultasFuturas": [
      {
        "id": "consulta-id",
        "nomePaciente": "Paciente",
        "nomeProfissional": "Dr. João",
        "dataConsulta": "2024-01-15T10:00:00Z",
        "status": "agendada",
        "observacoes": ""
      }
    ],
    "consultasRealizadas": [],
    "totalConsultasFuturas": 1,
    "totalConsultasRealizadas": 0
  }
}
```

---

### POST `/api/paciente/consultas`
**Agendar nova consulta**

**Body:**
```json
{
  "idClinica": "clinica-id" | null,
  "idProfissional": "profissional-id",
  "dataConsulta": "2024-01-15T10:00:00Z",
  "observacoes": "Consulta de rotina"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Consulta agendada com sucesso",
  "data": {
    "id": "consulta-id",
    "idPaciente": "paciente-uid",
    "nomePaciente": "Paciente",
    "idProfissional": "profissional-id",
    "nomeProfissional": "Dr. João",
    "dataConsulta": "2024-01-15T10:00:00Z",
    "status": "agendada",
    "observacoes": "Consulta de rotina"
  }
}
```

---

### GET `/api/paciente/consultas`
**Histórico de consultas (paginado)**

**Query Params:**
- `page` (opcional, default: 1)
- `limit` (opcional, default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Histórico carregado com sucesso",
  "data": [
    {
      "id": "consulta-id",
      "nomePaciente": "Paciente",
      "nomeProfissional": "Dr. João",
      "dataConsulta": "2024-01-15T10:00:00Z",
      "status": "realizada"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET `/api/paciente/consultas/:id`
**Detalhes de uma consulta**

**Response (200):**
```json
{
  "success": true,
  "message": "Consulta encontrada",
  "data": {
    "id": "consulta-id",
    "nomePaciente": "Paciente",
    "nomeProfissional": "Dr. João",
    "dataConsulta": "2024-01-15T10:00:00Z",
    "status": "agendada",
    "observacoes": ""
  }
}
```

---

### GET `/api/paciente/perfil`
**Ver perfil do paciente**

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil carregado com sucesso",
  "data": {
    "id": "paciente-uid",
    "nome": "Paciente",
    "email": "paciente@example.com",
    "telefone": "123456789",
    "cpf": "12345678900",
    "perfil": "paciente"
  }
}
```

---

### PUT `/api/paciente/perfil`
**Atualizar perfil do paciente**

**Body:**
```json
{
  "nome": "Nome Atualizado",
  "telefone": "987654321",
  "cpf": "12345678900",
  "dataNascimento": "1990-01-01"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "paciente-uid",
    "nome": "Nome Atualizado",
    "telefone": "987654321"
  }
}
```

---

## 🩺 PROFISSIONAL

**Todas as rotas requerem:** `Authorization: Bearer <token>`

### GET `/api/profissional/dashboard`
**Dashboard do profissional**

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard carregado com sucesso",
  "data": {
    "consultasHoje": [
      {
        "id": "consulta-id",
        "nomePaciente": "Paciente",
        "dataConsulta": "2024-01-15T10:00:00Z",
        "status": "confirmada"
      }
    ],
    "stats": {
      "total": 10,
      "agendadas": 5,
      "confirmadas": 3,
      "realizadas": 2,
      "canceladas": 0
    }
  }
}
```

---

### GET `/api/profissional/consultas`
**Listar consultas do profissional**

**Query Params:**
- `page` (opcional, default: 1)
- `limit` (opcional, default: 10)
- `status` (opcional: `agendada`, `confirmada`, `realizada`, `cancelada`)

**Response (200):**
```json
{
  "success": true,
  "message": "Consultas carregadas com sucesso",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

---

### GET `/api/profissional/consultas/:id`
**Detalhes de uma consulta**

**Response (200):**
```json
{
  "success": true,
  "message": "Consulta encontrada",
  "data": {
    "id": "consulta-id",
    "nomePaciente": "Paciente",
    "dataConsulta": "2024-01-15T10:00:00Z",
    "status": "agendada"
  }
}
```

---

### PATCH `/api/profissional/consultas/:id/status`
**Atualizar status da consulta**

**Body:**
```json
{
  "status": "confirmada"
}
```

**Status válidos:** `agendada`, `confirmada`, `realizada`, `cancelada`

**Response (200):**
```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "data": {
    "id": "consulta-id",
    "status": "confirmada"
  }
}
```

---

### GET `/api/profissional/prontuarios/:idPaciente`
**Ver prontuário do paciente**

**Response (200):**
```json
{
  "success": true,
  "message": "Prontuário encontrado",
  "data": {
    "id": "prontuario-id",
    "idPaciente": "paciente-id",
    "nomePaciente": "Paciente",
    "observacoes": "Observação principal",
    "historico": [
      {
        "data": "2024-01-15T10:00:00Z",
        "profissional": "Dr. João",
        "observacao": "Primeira observação"
      }
    ],
    "dataRegistro": "2024-01-01T00:00:00Z",
    "dataAtualizacao": "2024-01-15T10:00:00Z"
  }
}
```

---

### POST `/api/profissional/prontuarios/:idPaciente/observacoes`
**Adicionar observação ao prontuário**

**Body:**
```json
{
  "observacao": "Nova observação do profissional"
}
```

**Response (200/201):**
```json
{
  "success": true,
  "message": "Observação adicionada com sucesso",
  "data": {
    "id": "prontuario-id",
    "observacoes": "Nova observação do profissional",
    "historico": [
      {
        "data": "2024-01-15T10:00:00Z",
        "profissional": "Dr. João",
        "observacao": "Nova observação do profissional"
      }
    ]
  }
}
```

---

### GET `/api/profissional/perfil`
**Ver perfil do profissional**

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil carregado com sucesso",
  "data": {
    "id": "profissional-uid",
    "nome": "Dr. João",
    "email": "joao@example.com",
    "especialidade": "Cardiologia",
    "perfil": "profissional"
  }
}
```

---

### PUT `/api/profissional/perfil`
**Atualizar perfil do profissional**

**Body:**
```json
{
  "nome": "Dr. João Silva",
  "especialidade": "Cardiologia",
  "telefone": "123456789"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "profissional-uid",
    "nome": "Dr. João Silva",
    "especialidade": "Cardiologia"
  }
}
```

---

## 👨‍💻 ADMIN

**Todas as rotas requerem:** `Authorization: Bearer <token>`

### GET `/api/admin/dashboard`
**Dashboard do admin**

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard carregado com sucesso",
  "data": {
    "totalClinicas": 5,
    "totalProfissionais": 20,
    "totalFuncionarios": 15,
    "totalPacientes": 100,
    "totalConsultas": 50
  }
}
```

---

### GET `/api/admin/clinicas`
**Listar clínicas**

**Query Params:**
- `page` (opcional, default: 1)
- `limit` (opcional, default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Clínicas carregadas com sucesso",
  "data": [
    {
      "id": "clinica-id",
      "nome": "Clínica Teste",
      "email": "clinica@example.com",
      "telefone": "123456789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST `/api/admin/clinicas`
**Criar clínica**

**Body:**
```json
{
  "nome": "Nova Clínica",
  "email": "nova@example.com",
  "telefone": "123456789",
  "endereco": {
    "rua": "Rua Teste",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "12345678"
  },
  "cnpj": "12345678000190"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Clínica criada com sucesso",
  "data": {
    "id": "clinica-uid",
    "nome": "Nova Clínica",
    "email": "nova@example.com"
  }
}
```

---

### PUT `/api/admin/clinicas/:id`
**Atualizar clínica**

**Body:**
```json
{
  "nome": "Clínica Atualizada",
  "telefone": "987654321"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Clínica atualizada com sucesso",
  "data": {
    "id": "clinica-id",
    "nome": "Clínica Atualizada"
  }
}
```

---

### GET `/api/admin/profissionais`
**Listar profissionais**

**Query Params:**
- `page` (opcional, default: 1)
- `limit` (opcional, default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Profissionais carregados com sucesso",
  "data": [
    {
      "id": "profissional-id",
      "nome": "Dr. João",
      "email": "joao@example.com",
      "especialidade": "Cardiologia"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST `/api/admin/profissionais`
**Criar profissional**

**Body:**
```json
{
  "nome": "Dr. Novo",
  "email": "novo@example.com",
  "telefone": "123456789",
  "especialidade": "Cardiologia",
  "senha": "123456"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Profissional criado com sucesso",
  "data": {
    "id": "profissional-uid",
    "nome": "Dr. Novo",
    "email": "novo@example.com",
    "especialidade": "Cardiologia"
  }
}
```

---

### PUT `/api/admin/profissionais/:id`
**Atualizar profissional**

**Body:**
```json
{
  "nome": "Dr. Novo Atualizado",
  "especialidade": "Neurologia"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profissional atualizado com sucesso",
  "data": {
    "id": "profissional-id",
    "nome": "Dr. Novo Atualizado",
    "especialidade": "Neurologia"
  }
}
```

---

## 🔒 Autenticação

Todas as rotas (exceto `/api/auth/*`) requerem header:
```
Authorization: Bearer <token>
```

## 📝 Códigos de Status

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro de validação
- `401` - Não autorizado
- `403` - Acesso negado
- `404` - Não encontrado
- `409` - Conflito (ex: email já existe)
- `500` - Erro interno do servidor

## 🚀 Como Iniciar

```bash
cd src/mobile/backend
npm install
npm run dev
```

Servidor rodará em: `http://localhost:3001`

## ✅ Funcionalidades Implementadas

- ✅ Login/Cadastro
- ✅ Dashboard Paciente (consultas futuras e realizadas)
- ✅ Agendamento de consultas
- ✅ Histórico de consultas (paginado)
- ✅ Perfil do paciente (ver/editar)
- ✅ Dashboard Profissional (consultas do dia + estatísticas)
- ✅ Listar consultas do profissional
- ✅ Atualizar status de consultas
- ✅ Ver prontuários
- ✅ Adicionar observações ao prontuário
- ✅ Perfil do profissional (ver/editar)
- ✅ Dashboard Admin (estatísticas gerais)
- ✅ Gestão de clínicas (listar/criar/atualizar)
- ✅ Gestão de profissionais (listar/criar/atualizar)
- ✅ Validações completas
- ✅ Tratamento de erros
- ✅ Testes unitários (26 testes passando)

## 📋 Pronto para Integração!

Todas as rotas estão implementadas e testadas. O backend está **100% pronto** para integração com o frontend mobile! 🚀

