# 🔒 Como Aplicar Regras de Segurança do Firestore

## ⚠️ Problema: "Missing or insufficient permissions"

O erro indica que as regras padrão do Firestore estão bloqueando o acesso. Você precisa aplicar as regras de segurança que criei.

## ✅ Solução: Aplicar Regras no Firebase Console

### Passo 1: Acessar o Editor de Regras

1. Acesse: https://console.firebase.google.com/project/medify-401a8/firestore/rules

2. Ou:
   - Vá para: https://console.firebase.google.com/project/medify-401a8
   - Clique em **Firestore Database**
   - Vá na aba **Regras** (Rules)

### Passo 2: Copiar as Regras

O arquivo `firestore.rules` já está criado com as regras corretas. Abra o arquivo e copie todo o conteúdo.

### Passo 3: Colar no Console

1. No editor de regras do Firebase Console, **DELETE** todas as regras existentes
2. **COLE** as regras do arquivo `firestore.rules`
3. Clique em **"Publicar"** (Publish)

### Passo 4: Aguardar

As regras são aplicadas imediatamente, mas pode levar alguns segundos para propagar.

## 📋 Regras Criadas

As regras permitem:

✅ **Usuários autenticados** podem ler/escrever seus próprios perfis  
✅ **Profissionais** podem ler pacientes (para consultas)  
✅ **Usuários autenticados** podem criar/ler consultas  
✅ **Profissionais** podem ler/escrever prontuários  

## 🎯 Depois de Aplicar

Depois de aplicar as regras:

1. **Recarregue a página** do Electron (Ctrl+R ou F5)
2. **Faça login novamente**
3. O erro de permissões deve desaparecer

## 📝 Regras Temporárias (Apenas para Teste)

Se precisar testar rapidamente sem restrições (⚠️ NÃO USE EM PRODUÇÃO):

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

Esta regra permite que qualquer usuário autenticado leia/escreva tudo. **Use apenas para desenvolvimento!**

## 🔍 Verificar se Funcionou

Depois de aplicar as regras, faça login novamente. Se ainda der erro:

1. Verifique se as regras foram publicadas
2. Aguarde 30 segundos para propagação
3. Recarregue a página
4. Tente fazer login novamente

