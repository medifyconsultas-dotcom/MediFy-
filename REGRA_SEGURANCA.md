# 🔒 Regras de Segurança do Firestore

## 📝 Arquivo Criado: `firestore.rules`

Criei um arquivo com as regras de segurança do Firestore que permite:

### ✅ Permissões Configuradas

1. **Pacientes**
   - Podem ler/editar apenas seu próprio perfil
   - Profissionais podem ler pacientes (para consultas)

2. **Profissionais**
   - Podem ler/editar apenas seu próprio perfil
   - Outros podem ler profissionais (para agendamentos)

3. **Clínicas**
   - Podem ler/editar apenas seu próprio perfil
   - Podem gerenciar seus funcionários

4. **Funcionários**
   - Podem ler/editar apenas seu próprio perfil
   - Clínicas podem ler seus funcionários

5. **Consultas**
   - Usuários autenticados podem ler/criar
   - Usuários autenticados podem atualizar/deletar

6. **Prontuários**
   - Usuários autenticados podem ler/escrever

## 🚀 Como Aplicar as Regras

### Opção 1: Via Firebase Console (Recomendado)

1. Acesse: https://console.firebase.google.com/project/medify-401a8/firestore/rules
2. Copie o conteúdo do arquivo `firestore.rules`
3. Cole no editor de regras do Firebase Console
4. Clique em **"Publicar"**

### Opção 2: Via Firebase CLI

Se você tiver o Firebase CLI instalado:

```bash
firebase deploy --only firestore:rules
```

## ⚠️ Importante

As regras atuais permitem acesso amplo para usuários autenticados. Em produção, você deve:

1. Restringir mais as permissões de escrita
2. Adicionar validações de dados
3. Adicionar verificações de roles/perfis

## 🎯 Resultado

Depois de aplicar as regras, os usuários poderão:
- ✅ Fazer login
- ✅ Ler seus próprios perfis
- ✅ Ver consultas relacionadas
- ✅ Acessar prontuários autorizados

