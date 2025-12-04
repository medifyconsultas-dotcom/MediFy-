# 🔥 Instruções para Resetar e Inicializar Firebase

## ⚠️ IMPORTANTE

Eu **NÃO** criei os logins automaticamente nem resetei o banco porque preciso das credenciais de administrador do Firebase. Aqui está como fazer:

## 📋 Passo a Passo

### 1. Configurar Service Account Key

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Configurações do Projeto** → **Contas de serviço**
3. Clique em **Gerar nova chave privada**
4. Baixe o arquivo JSON
5. Renomeie para `serviceAccountKey.json`
6. Coloque na raiz do projeto (mesmo nível do `package.json`)

⚠️ **ATENÇÃO**: Não commite este arquivo no Git! Ele já está no `.gitignore`.

### 2. Instalar Dependências

```bash
npm install
```

### 3. Limpar Firebase (RESETAR TUDO)

```bash
npm run clear:firebase
```

Este comando vai:
- 🗑️ Deletar TODOS os documentos das coleções
- 👤 Deletar TODOS os usuários do Auth
- ✨ Deixar o Firebase completamente limpo

### 4. Criar Usuários de Exemplo

```bash
npm run init:firebase
```

Este comando vai criar:

#### 👥 Usuários Criados:

**Clínica:**
- Email: `clinica@medify.com`
- Senha: `123456`

**Profissional:**
- Email: `profissional@medify.com`
- Senha: `123456`

**Recepcionista:**
- Email: `recepcionista@medify.com`
- Senha: `123456`

**Médico:**
- Email: `medico@medify.com`
- Senha: `123456`

**Enfermeiro:**
- Email: `enfermeiro@medify.com`
- Senha: `123456`

#### 📊 Dados Criados:

- ✅ 1 Clínica
- ✅ 1 Profissional
- ✅ 1 Recepcionista
- ✅ 1 Médico
- ✅ 1 Enfermeiro
- ✅ 1 Paciente de exemplo
- ✅ 1 Consulta de exemplo

## 🎯 Como Usar

1. **Primeiro, limpe tudo:**
```bash
npm run clear:firebase
```

2. **Depois, crie os dados de exemplo:**
```bash
npm run init:firebase
```

3. **Agora você pode fazer login no app!**

## 🔒 Segurança

O arquivo `serviceAccountKey.json` contém credenciais sensíveis. Ele está no `.gitignore` para não ser commitado acidentalmente.

## 📝 Notas

- Os scripts usam o **Firebase Admin SDK** (server-side)
- Você precisa ter permissões de administrador no projeto
- O script de limpeza deleta **TUDO**, use com cuidado!
- Você pode editar os scripts em `scripts/` para personalizar os dados criados

## ❓ Problemas?

Se der erro ao executar os scripts:

1. Verifique se o `serviceAccountKey.json` está na raiz do projeto
2. Verifique se você tem permissões de administrador no Firebase
3. Verifique se o `project_id` no JSON está correto
4. Certifique-se de ter instalado todas as dependências (`npm install`)

