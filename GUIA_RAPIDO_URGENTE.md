# 🚨 GUIA URGENTE - 1 HORA PARA APRESENTAÇÃO

## ✅ PASSO A PASSO RÁPIDO (15 MINUTOS):

### 1️⃣ APLICAR REGRAS DE SEGURANÇA (2 MINUTOS) ⚠️ CRÍTICO!

1. Abra: https://console.firebase.google.com/project/medify-401a8/firestore/rules
2. **DELETE** tudo que está lá
3. **COLE** isso:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Clique em **"Publicar"**
5. ✅ **FEITO!**

### 2️⃣ ADICIONAR PERMISSÕES IAM (5 MINUTOS)

1. Abra: https://console.developers.google.com/iam-admin/iam/project?project=medify-401a8
2. Procure: `firebase-adminsdk-fbsvc@medify-401a8.iam.gserviceaccount.com`
3. Clique no ícone de editar (✏️)
4. Clique em **"Adicionar outro papel"**
5. Adicione:
   - `Service Usage Consumer`
   - `Firebase Admin SDK Administrator Service Agent`
6. Salve
7. **AGUARDE 3-5 MINUTOS** ⏰

### 3️⃣ EXECUTAR RESET (2 MINUTOS)

Depois de aguardar as permissões, execute:

```bash
npm run reset:firebase
```

Se der erro, aguarde mais 2 minutos e tente novamente.

### 4️⃣ TESTAR (5 MINUTOS)

1. Recarregue o Electron (Ctrl+R)
2. Faça login:
   - Email: `clinica@medify.com`
   - Senha: `123456`
3. Verifique se o dashboard carrega
4. Teste outros logins:
   - `recepcionista@medify.com` / `123456`
   - `medico@medify.com` / `123456`

## ✅ CHECKLIST FINAL:

- [ ] Regras aplicadas no Firebase Console
- [ ] Permissões IAM adicionadas
- [ ] Aguardou 3-5 minutos para propagação
- [ ] Reset executado com sucesso
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Dados aparecendo

## 🎯 DADOS CRIADOS PELO RESET:

- ✅ 5 usuários
- ✅ 15 pacientes
- ✅ ~14 consultas
- ✅ ~6 prontuários

## 🆘 SE DER ERRO:

**"Missing or insufficient permissions":**
- As regras não foram aplicadas corretamente
- Refaça o PASSO 1

**"Permission denied" no reset:**
- Permissões IAM não propagaram
- Aguarde mais 2 minutos
- Tente novamente

**Erro 400 no login:**
- Verifique se o usuário existe no Firebase Console
- Confirme que as regras foram aplicadas

## 🎉 DEPOIS DE TUDO:

Você terá um sistema completo funcionando com:
- ✅ Login funcionando
- ✅ Todos os perfis criados
- ✅ Dados simulados no banco
- ✅ Dashboards funcionando
- ✅ Pronto para apresentação!

