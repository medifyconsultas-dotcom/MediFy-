# 🔄 Instruções para Reset do Firebase

## ⚠️ Problema Atual

O erro indica que a **chave de serviço** (`serviceAccountKey.json`) está inválida ou foi revogada.

## ✅ Solução: Gerar Nova Chave de Serviço

### Passo 1: Acessar o Console do Firebase

1. Acesse: https://console.firebase.google.com/project/medify-401a8/settings/serviceaccounts/adminsdk

2. Ou vá em:
   - Console Firebase → Projeto `medify-401a8`
   - Configurações do projeto (⚙️)
   - Contas de serviço
   - Aba "SDK do Admin do Firebase"

### Passo 2: Gerar Nova Chave

1. Clique em **"Gerar nova chave privada"**
2. Uma janela de confirmação aparecerá
3. Clique em **"Gerar chave"**
4. Um arquivo JSON será baixado automaticamente

### Passo 3: Substituir o Arquivo

1. O arquivo baixado terá um nome como: `medify-401a8-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`
2. Renomeie o arquivo para: `serviceAccountKey.json`
3. Substitua o arquivo `serviceAccountKey.json` na raiz do projeto

### Passo 4: Executar o Reset

Depois de substituir o arquivo, execute:

```bash
npm run reset:firebase
```

## 📝 Credenciais Após o Reset

Depois do reset bem-sucedido, você poderá fazer login com:

- **Clínica:** `clinica@medify.com` / `123456`
- **Profissional:** `profissional@medify.com` / `123456`
- **Recepcionista:** `recepcionista@medify.com` / `123456`
- **Médico:** `medico@medify.com` / `123456`
- **Enfermeiro:** `enfermeiro@medify.com` / `123456`

## 🔍 Verificar se a Chave Está Correta

A chave de serviço deve ter:
- `project_id: "medify-401a8"`
- `client_email` contendo `@medify-401a8.iam.gserviceaccount.com`

## ⚡ Alternativa: Reset Manual pelo Console

Se não conseguir gerar a chave, você pode:

1. **Limpar dados manualmente:**
   - Acesse o Console do Firebase
   - Vá em Firestore Database e delete as coleções manualmente
   - Vá em Authentication e delete os usuários manualmente

2. **Criar usuários manualmente:**
   - Acesse Authentication no Console
   - Clique em "Adicionar usuário"
   - Crie os usuários de exemplo com as credenciais acima

## 🆘 Erros Comuns

### "Invalid JWT Signature"
- **Causa:** Chave de serviço inválida ou revogada
- **Solução:** Gerar nova chave de serviço (Passo 2)

### "Project not found"
- **Causa:** Chave de serviço de outro projeto
- **Solução:** Verificar se o `project_id` na chave é `medify-401a8`

### "Permission denied"
- **Causa:** Chave de serviço sem permissões adequadas
- **Solução:** Gerar nova chave de serviço ou verificar permissões do IAM

