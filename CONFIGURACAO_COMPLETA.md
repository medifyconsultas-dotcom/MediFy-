# ✅ Configuração Completa do Firebase - Atualizada

## 🔥 Configuração do Firebase Web

A configuração do Firebase foi atualizada com as novas credenciais:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94",
  authDomain: "medify-401a8.firebaseapp.com",
  projectId: "medify-401a8",
  storageBucket: "medify-401a8.firebasestorage.app",
  messagingSenderId: "1020474309747",
  appId: "1:1020474309747:web:0dbc2ca2878cda10a2be06",
  measurementId: "G-D12PR6Y0EC"
}
```

**Arquivo:** `src/firebase/config.ts` ✅ Atualizado

## 👥 Usuários para Criar

### Credenciais de Login:

1. **Clínica**
   - Email: `clinica@medify.com`
   - Senha: `123456`
   - Perfil: `clinica`

2. **Profissional**
   - Email: `profissional@medify.com`
   - Senha: `123456`
   - Perfil: `profissional`

3. **Recepcionista**
   - Email: `recepcionista@medify.com`
   - Senha: `123456`
   - Perfil: `recepcionista`

4. **Médico**
   - Email: `medico@medify.com`
   - Senha: `123456`
   - Perfil: `medico`

5. **Enfermeiro**
   - Email: `enfermeiro@medify.com`
   - Senha: `123456`
   - Perfil: `enfermeiro`

## 🚀 Próximos Passos

### Opção 1: Criar Usuários Manualmente (Recomendado)

1. **Acesse o Console do Firebase:**
   - Authentication: https://console.firebase.google.com/project/medify-401a8/authentication/users
   - Firestore: https://console.firebase.google.com/project/medify-401a8/firestore

2. **Crie os usuários:**
   - Adicione cada usuário no Firebase Authentication
   - Crie os perfis correspondentes no Firestore
   - Veja instruções detalhadas em: `scripts/createUsersManually.md`

### Opção 2: Usar Script de Reset (Requer Chave de Serviço Válida)

1. **Gere uma nova chave de serviço:**
   - Acesse: https://console.firebase.google.com/project/medify-401a8/settings/serviceaccounts/adminsdk
   - Clique em "Gerar nova chave privada"
   - Baixe o arquivo JSON
   - Renomeie para `serviceAccountKey.json`
   - Substitua na raiz do projeto

2. **Execute o reset:**
   ```bash
   npm run reset:firebase
   ```

## 📋 Scripts Disponíveis

- `npm run verify:service` - Verifica se a chave de serviço está válida
- `npm run reset:firebase` - Reseta tudo e cria usuários de exemplo
- `npm run init:firebase` - Cria apenas usuários de exemplo
- `npm run clear:firebase` - Limpa todos os dados
- `npm run seed:data` - Cria dados simulados (consultas, prontuários, etc.)

## ✅ Status Atual

- ✅ Configuração do Firebase Web atualizada
- ✅ Scripts de gerenciamento criados
- ⚠️ Usuários precisam ser criados (manual ou via script)
- ⚠️ Chave de serviço precisa ser gerada/atualizada para usar scripts

## 🎯 Teste de Login

Depois de criar os usuários, teste o login no Electron:

1. Execute: `npm run dev`
2. Faça login com qualquer credencial acima
3. O sistema deve redirecionar para o dashboard apropriado

