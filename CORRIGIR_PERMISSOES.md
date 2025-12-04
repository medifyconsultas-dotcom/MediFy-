# 🔐 Corrigir Permissões da Conta de Serviço

## ⚠️ Problema

A conta de serviço não tem permissões para usar os serviços do Firebase. É necessário adicionar as permissões no IAM do Google Cloud.

## ✅ Solução: Adicionar Permissões

### Passo 1: Acessar o IAM do Google Cloud

1. Acesse: https://console.developers.google.com/iam-admin/iam/project?project=medify-401a8

   Ou:
   
   - Vá para: https://console.cloud.google.com/
   - Selecione o projeto: `medify-401a8`
   - Vá em: **IAM & Admin** > **IAM**

### Passo 2: Encontrar a Conta de Serviço

Procure por: `firebase-adminsdk-fbsvc@medify-401a8.iam.gserviceaccount.com`

### Passo 3: Adicionar Roles Necessárias

Clique no ícone de editar (✏️) ao lado da conta de serviço e adicione as seguintes roles:

1. **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)
   - Permite usar serviços do Google Cloud

2. **Firebase Admin SDK Administrator Service Agent** (`roles/firebase.sdkAdminServiceAgent`)
   - Permite usar o Admin SDK do Firebase

3. **Editor** (`roles/editor`) - Opcional mas recomendado
   - Permite gerenciar recursos do Firebase

### Passo 4: Salvar e Aguardar

1. Clique em **Salvar**
2. Aguarde alguns minutos para a propagação das permissões

### Passo 5: Testar Novamente

Depois de adicionar as permissões e aguardar alguns minutos, execute:

```bash
npm run reset:firebase
```

## 🚀 Alternativa Rápida: Usar Firebase Admin no Console

Se preferir, você pode usar o Console do Firebase para:

1. **Habilitar APIs necessárias:**
   - https://console.cloud.google.com/apis/library?project=medify-401a8
   - Procure e habilite:
     - Identity Toolkit API
     - Cloud Firestore API
     - Firebase Authentication API

2. **Criar usuários manualmente:**
   - https://console.firebase.google.com/project/medify-401a8/authentication/users
   - Veja instruções em: `scripts/createUsersManually.md`

## 📋 Roles Mínimas Necessárias

A conta de serviço precisa ter pelo menos:
- ✅ `roles/serviceusage.serviceUsageConsumer`
- ✅ `roles/firebase.sdkAdminServiceAgent`

## ⏱️ Aguardar Propagação

Depois de adicionar as permissões, **aguarde 2-5 minutos** antes de tentar novamente. A propagação das permissões pode levar alguns minutos.

