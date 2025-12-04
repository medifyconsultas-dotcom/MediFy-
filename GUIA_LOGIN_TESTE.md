# 🚀 Guia Rápido: Como Fazer Login e Testar

## 📋 Opção 1: Usar Script Automático (Recomendado)

### 1. Criar Usuários de Teste

Execute o script para criar todos os usuários automaticamente:

```bash
npm run init:firebase
```

Este comando cria:
- ✅ Todos os usuários no Firebase Auth
- ✅ Todos os perfis no Firestore
- ✅ Dados de exemplo (pacientes, consultas)

### 2. Iniciar o App

```bash
npm run dev
```

Ou se estiver usando Electron:

```bash
npm run electron
```

### 3. Fazer Login

Acesse: `http://localhost:5173` (ou abra o Electron)

Use qualquer uma das credenciais abaixo:

---

## 🔐 Credenciais de Login

### 👨‍⚕️ **Profissional Autônomo** (NOVO - Dashboard Completo)
- **Email:** `profissional@medify.com`
- **Senha:** `123456`
- **O que testar:**
  - ✅ Dashboard com agenda de consultas
  - ✅ Visualizar prontuários vinculados às consultas
  - ✅ Criar novos prontuários
  - ✅ Adicionar observações aos prontuários
  - ✅ Editar histórico de observações
  - ✅ Atualizar status das consultas

### 🏥 **Clínica**
- **Email:** `clinica@medify.com`
- **Senha:** `123456`
- **O que testar:**
  - ✅ Dashboard com estatísticas
  - ✅ Gerenciar funcionários
  - ✅ Ver consultas da clínica

### 👩‍💼 **Recepcionista**
- **Email:** `recepcionista@medify.com`
- **Senha:** `123456`
- **O que testar:**
  - ✅ Agendar consultas
  - ✅ Ver todos os prontuários da clínica
  - ✅ Criar/editar prontuários
  - ✅ Editar histórico de observações

### 👨‍⚕️ **Médico** (Funcionário de Clínica)
- **Email:** `medico@medify.com`
- **Senha:** `123456`
- **O que testar:**
  - ✅ Dashboard com pacientes do dia
  - ✅ Ver prontuários próprios OU todos da clínica (toggle)
  - ✅ Criar/editar prontuários
  - ✅ Adicionar novas observações
  - ✅ Editar histórico de observações

### 👩‍⚕️ **Enfermeiro** (Funcionário de Clínica)
- **Email:** `enfermeiro@medify.com`
- **Senha:** `123456`
- **O que testar:**
  - ✅ Dashboard com pacientes do dia
  - ✅ Ver prontuários próprios OU todos da clínica (toggle)
  - ✅ Criar/editar prontuários
  - ✅ Adicionar novas observações
  - ✅ Editar histórico de observações

---

## 📋 Opção 2: Criar Usuários Manualmente

Se o script não funcionar, você pode criar manualmente:

### 1. Acesse o Firebase Console

- **Auth:** https://console.firebase.google.com/project/medify-401a8/authentication/users
- **Firestore:** https://console.firebase.google.com/project/medify-401a8/firestore

### 2. Criar Usuário no Auth

1. Clique em **"Adicionar usuário"**
2. Preencha:
   - Email: `profissional@medify.com` (ou outro)
   - Senha: `123456`
   - Marque **"Email verificado"**
3. Anote o **UID** gerado

### 3. Criar Perfil no Firestore

1. Vá para a coleção `profissionais` (ou `funcionarios`, `clinicas`)
2. Crie um documento com o **UID** como ID do documento
3. Adicione os campos:

**Para Profissional Autônomo** (coleção: `profissionais`):
```json
{
  "id": "SEU_UID_AQUI",
  "nome": "Dr. João Silva",
  "email": "profissional@medify.com",
  "especialidade": "Cardiologia",
  "crm": "CRM 123456",
  "cpfCnpj": "123.456.789-00",
  "telefone": "(11) 98765-4321",
  "idClinica": null,
  "perfil": "profissional",
  "dataCriacao": (timestamp atual)
}
```

**Para Médico de Clínica** (coleção: `funcionarios`):
```json
{
  "id": "SEU_UID_AQUI",
  "nome": "Dr. Carlos Oliveira",
  "email": "medico@medify.com",
  "especialidade": "Pediatria",
  "crm": "CRM 789012",
  "telefone": "(11) 98765-4321",
  "cargo": "medico",
  "perfil": "medico",
  "idClinica": "UID_DA_CLINICA",
  "dataCriacao": (timestamp atual)
}
```

Veja mais exemplos em: `scripts/createUsersManually.md`

---

## ✅ Checklist de Testes

### Para Profissional Autônomo (`profissional@medify.com`)

- [ ] Login funciona
- [ ] Dashboard mostra consultas
- [ ] Filtros funcionam (hoje, semana, mês, todas)
- [ ] Clicar em consulta abre modal de prontuário
- [ ] Pode criar novo prontuário
- [ ] Pode adicionar nova observação
- [ ] Pode editar histórico de observações
- [ ] Pode atualizar status da consulta
- [ ] Aba "Prontuários" mostra apenas seus prontuários
- [ ] Não tem acesso a prontuários de outros profissionais

### Para Médico/Enfermeiro (`medico@medify.com` / `enfermeiro@medify.com`)

- [ ] Login funciona
- [ ] Dashboard mostra pacientes do dia
- [ ] Toggle "Meus Prontuários" / "Todos da Clínica" funciona
- [ ] Pode criar/editar prontuários
- [ ] Pode adicionar novas observações
- [ ] Pode editar histórico
- [ ] Aba "Prontuários" funciona corretamente

### Para Recepcionista (`recepcionista@medify.com`)

- [ ] Login funciona
- [ ] Pode agendar consultas
- [ ] Vê todos os prontuários da clínica
- [ ] Pode criar/editar prontuários
- [ ] Aviso antes de editar aparece

---

## 🐛 Problemas Comuns

### "Perfil não encontrado"
- Verifique se o documento foi criado no Firestore
- Verifique se o UID do documento corresponde ao UID do Auth
- Verifique se o campo `perfil` está correto

### "Erro ao carregar perfil"
- Verifique o console do navegador
- Verifique se a coleção está correta (`profissionais`, `funcionarios`, etc.)
- Verifique se todos os campos obrigatórios estão preenchidos

### "Não consigo criar prontuário"
- Verifique se você está logado como perfil correto
- Profissionais autônomos podem criar prontuários
- Verifique se há pacientes cadastrados

---

## 🎯 Teste Rápido (5 minutos)

1. **Execute:** `npm run init:firebase`
2. **Inicie:** `npm run dev`
3. **Login:** `profissional@medify.com` / `123456`
4. **Teste:**
   - Veja o dashboard
   - Clique em uma consulta
   - Crie um prontuário
   - Adicione uma observação
   - Edite o histórico

Pronto! ✅

