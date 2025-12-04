# 👥 Criar Usuários Manualmente no Firebase Console

## ✅ Configuração Atualizada

A configuração do Firebase foi atualizada com as novas credenciais:
- **App ID:** `0dbc2ca2878cda10a2be06`
- **Measurement ID:** `G-D12PR6Y0EC`

## 📝 Como Criar Usuários Manualmente

Como a chave de serviço pode estar com problemas, aqui está o guia para criar os usuários manualmente:

### Passo 1: Acessar o Console do Firebase

1. Acesse: https://console.firebase.google.com/project/medify-401a8/authentication/users
2. Clique em **"Adicionar usuário"** (ou "Add user")

### Passo 2: Criar Cada Usuário

Crie os seguintes usuários um por um:

#### 1. Clínica
- **Email:** `clinica@medify.com`
- **Senha:** `123456`
- **Email verificado:** ✅ (marque a opção)

#### 2. Profissional
- **Email:** `profissional@medify.com`
- **Senha:** `123456`
- **Email verificado:** ✅

#### 3. Recepcionista
- **Email:** `recepcionista@medify.com`
- **Senha:** `123456`
- **Email verificado:** ✅

#### 4. Médico
- **Email:** `medico@medify.com`
- **Senha:** `123456`
- **Email verificado:** ✅

#### 5. Enfermeiro
- **Email:** `enfermeiro@medify.com`
- **Senha:** `123456`
- **Email verificado:** ✅

### Passo 3: Criar Perfis no Firestore

Depois de criar os usuários no Auth, você precisa criar os perfis no Firestore. Acesse:
https://console.firebase.google.com/project/medify-401a8/firestore

#### Coleção: `clinicas`
Documento ID: (UID do usuário `clinica@medify.com`)
```json
{
  "nome": "Clínica Medify",
  "nomeFantasia": "Clínica Medify Exemplo",
  "cnpj": "12.345.678/0001-90",
  "telefone": "(11) 98765-4321",
  "endereco": "Rua Exemplo, 123 - São Paulo, SP",
  "perfil": "clinica",
  "email": "clinica@medify.com",
  "dataCriacao": (timestamp atual)
}
```

#### Coleção: `profissionais`
Documento ID: (UID do usuário `profissional@medify.com`)
```json
{
  "nome": "Dr. João Silva",
  "especialidade": "Cardiologia",
  "crm": "CRM 123456",
  "cpfCnpj": "123.456.789-00",
  "telefone": "(11) 98765-4321",
  "idClinica": null,
  "perfil": "profissional",
  "email": "profissional@medify.com",
  "dataCriacao": (timestamp atual)
}
```

#### Coleção: `funcionarios`
Documento ID: (UID do usuário `recepcionista@medify.com`)
```json
{
  "nome": "Maria Santos",
  "telefone": "(11) 98765-4321",
  "cargo": "recepcionista",
  "perfil": "recepcionista",
  "idClinica": (UID da clínica criada acima),
  "email": "recepcionista@medify.com",
  "dataCriacao": (timestamp atual)
}
```

Documento ID: (UID do usuário `medico@medify.com`)
```json
{
  "nome": "Dr. Carlos Oliveira",
  "especialidade": "Pediatria",
  "crm": "CRM 789012",
  "telefone": "(11) 98765-4321",
  "cargo": "medico",
  "perfil": "medico",
  "idClinica": (UID da clínica criada acima),
  "email": "medico@medify.com",
  "dataCriacao": (timestamp atual)
}
```

Documento ID: (UID do usuário `enfermeiro@medify.com`)
```json
{
  "nome": "Ana Costa",
  "especialidade": "Enfermagem Geral",
  "telefone": "(11) 98765-4321",
  "cargo": "enfermeiro",
  "perfil": "enfermeiro",
  "idClinica": (UID da clínica criada acima),
  "email": "enfermeiro@medify.com",
  "dataCriacao": (timestamp atual)
}
```

## 🎯 Depois de Criar

Após criar todos os usuários e perfis, você poderá fazer login no Electron com qualquer uma das credenciais:

- `clinica@medify.com` / `123456`
- `profissional@medify.com` / `123456`
- `recepcionista@medify.com` / `123456`
- `medico@medify.com` / `123456`
- `enfermeiro@medify.com` / `123456`

## 🔧 Alternativa: Usar Script de Reset

Se conseguir gerar uma nova chave de serviço válida:
1. Baixe a nova chave do Console do Firebase
2. Substitua o arquivo `serviceAccountKey.json`
3. Execute: `npm run reset:firebase`

