# 🔐 Atualização do Sistema de Autenticação

## ✅ O que foi corrigido:

1. **Login agora usa REST API do Firebase Auth** para obter ID token real (verificando senha)
2. **Middleware busca perfil em todas as collections** (pacientes, profissionais, clínicas, funcionarios, users)
3. **Token é salvo automaticamente** após login no AsyncStorage

## 📝 Configuração Necessária:

Adicione a `FIREBASE_API_KEY` no arquivo `.env`:

```env
FIREBASE_API_KEY=AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94
```

Esta chave está no arquivo `src/firebase/config.ts` do projeto desktop/web.

## 🔄 Como funciona agora:

1. **Login:**
   - Usa REST API do Firebase Auth para verificar senha
   - Obtém ID token real (não custom token)
   - Token é salvo no AsyncStorage

2. **Requisições:**
   - Token é carregado do AsyncStorage
   - Enviado no header `Authorization: Bearer <token>`
   - Middleware verifica o token com `auth.verifyIdToken()`

3. **Busca de Perfil:**
   - Busca em todas as collections (pacientes, profissionais, clínicas, funcionarios, users)
   - Para funcionários, usa `cargo` como `perfil` se for válido

## 🚀 Próximos passos:

1. Adicione `FIREBASE_API_KEY` no `.env`
2. Reinicie o servidor backend
3. Faça login novamente no app mobile
4. O token será salvo e usado automaticamente

