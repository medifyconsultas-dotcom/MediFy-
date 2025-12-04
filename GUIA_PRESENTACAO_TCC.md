# 🚨 GUIA URGENTE - APRESENTAÇÃO DO TCC (1 HORA)

## ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS:

1. ❌ Erro CSSStyleDeclaration no Button
2. ❌ Erro 400 (permissões do Firestore)
3. ❌ Banco de dados precisa ser resetado

## ✅ CORREÇÕES URGENTES:

### 1️⃣ APLICAR REGRAS DE SEGURANÇA (OBRIGATÓRIO - 2 MINUTOS)

1. Acesse: https://console.firebase.google.com/project/medify-401a8/firestore/rules
2. Copie TODO o conteúdo do arquivo `firestore.rules`
3. Cole no editor e clique em **"Publicar"**
4. **ISSO É CRÍTICO!** Sem isso, nada funciona!

### 2️⃣ ADICIONAR PERMISSÕES IAM (OBRIGATÓRIO - 5 MINUTOS)

1. Acesse: https://console.developers.google.com/iam-admin/iam/project?project=medify-401a8
2. Encontre: `firebase-adminsdk-fbsvc@medify-401a8.iam.gserviceaccount.com`
3. Clique em editar (✏️)
4. Adicione estas roles:
   - ✅ `Service Usage Consumer` (roles/serviceusage.serviceUsageConsumer)
   - ✅ `Firebase Admin SDK Administrator Service Agent` (roles/firebase.sdkAdminServiceAgent)
5. Salve e **AGUARDE 2-5 MINUTOS**

### 3️⃣ EXECUTAR RESET COMPLETO (OBRIGATÓRIO - 2 MINUTOS)

Depois das permissões propagarem, execute:

```bash
npm run reset:firebase
```

Isso vai criar:
- ✅ 5 usuários de exemplo
- ✅ 15 pacientes
- ✅ ~14 consultas (7 dias)
- ✅ ~6 prontuários

### 4️⃣ TESTAR LOGIN (CRÍTICO)

Faça login com:
- `clinica@medify.com` / `123456`
- `recepcionista@medify.com` / `123456`
- `medico@medify.com` / `123456`

## 🎯 CHECKLIST PRÉ-APRESENTAÇÃO:

- [ ] Regras de segurança aplicadas
- [ ] Permissões IAM adicionadas e propagadas
- [ ] Reset do Firebase executado com sucesso
- [ ] Login funcionando para todos os perfis
- [ ] Dashboards carregando corretamente
- [ ] Dados aparecendo nas telas

## 📋 O QUE FOI CORRIGIDO:

1. ✅ Button component (erro CSSStyleDeclaration)
2. ✅ Script de reset completo com dados simulados
3. ✅ Regras de segurança do Firestore
4. ✅ Estrutura do banco de dados

## 🚀 COMANDOS RÁPIDOS:

```bash
# Verificar chave de serviço
npm run verify:service

# Reset completo (DEPOIS das permissões)
npm run reset:firebase

# Rodar aplicação
npm run dev
```

## ⏱️ TEMPO ESTIMADO:

- Aplicar regras: 2 minutos
- Adicionar permissões + propagação: 5-10 minutos
- Executar reset: 2 minutos
- Testar: 5 minutos
- **TOTAL: ~20 minutos**

## 🆘 SE ALGO DER ERRADO:

1. **Erro de permissões persistindo:**
   - Verifique se as regras foram publicadas
   - Aguarde mais 30 segundos
   - Recarregue a página (Ctrl+R)

2. **Script de reset falhando:**
   - Verifique permissões IAM novamente
   - Aguarde mais tempo para propagação
   - Tente novamente

3. **Login não funcionando:**
   - Verifique se os usuários foram criados no Firebase Console
   - Confirme que as regras foram aplicadas
   - Verifique o console do navegador para erros

## 🎉 DEPOIS DE TUDO:

O sistema terá:
- ✅ Login funcionando
- ✅ 5 usuários de exemplo
- ✅ 15 pacientes
- ✅ ~14 consultas
- ✅ ~6 prontuários
- ✅ Todos os dashboards funcionando
- ✅ Tudo pronto para apresentação!

