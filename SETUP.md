# Setup do Projeto Medify Desktop

## 📦 Instalação

1. Instale as dependências:
```bash
npm install
```

## 🚀 Executar em Desenvolvimento

Execute o aplicativo em modo de desenvolvimento:

```bash
npm run dev
```

Isso iniciará:
- Servidor Vite na porta 5173
- Aplicativo Electron

## 🏗️ Build para Produção

Para criar um build de produção:

```bash
npm run build
```

## ✅ O que já está implementado:

### Estrutura Base
- ✅ Configuração Electron com React e TypeScript
- ✅ Firebase Auth configurado
- ✅ Firestore configurado
- ✅ Roteamento protegido

### Autenticação
- ✅ Tela de Login
- ✅ Sistema de autenticação com Firebase Auth
- ✅ Logout
- ✅ Contexto de autenticação
- ✅ Proteção de rotas por perfil

### Dashboards
- ✅ Dashboard Clínica (estatísticas e consultas)
- ✅ Dashboard Profissional (agenda detalhada)
- ✅ Dashboard Recepcionista (consultas do dia)
- ✅ Dashboard Médico/Enfermeiro (pacientes do dia)

### Funcionalidades
- ✅ Gerenciamento de Funcionários (Clínica)
  - Cadastrar funcionários (recepcionista, médico, enfermeiro)
  - Listar funcionários
  - Editar funcionários
  - Excluir funcionários
- ✅ Edição de Perfil
  - Perfil da Clínica
  - Perfil do Profissional
  - Edição de dados pessoais

### Interface
- ✅ Layout com sidebar responsiva
- ✅ Menu de navegação por perfil
- ✅ Animações básicas com Framer Motion
- ✅ Tema roxo para médicos
- ✅ Loading screens

## 🔨 Próximos Passos:

### Funcionalidades Restantes:
- ⏳ Agendamento Rápido (Recepcionista)
- ⏳ Gestão de Prontuários (visualização e edição)
- ⏳ Notificações e feedback visual
- ⏳ Validações de permissões em ações específicas
- ⏳ Animações e loadings mais elaborados

### Melhorias:
- ⏳ Testes básicos
- ⏳ Tratamento de erros mais robusto
- ⏳ Páginas de consultas detalhadas
- ⏳ Sistema de busca e filtros

## 📝 Notas Importantes:

1. **Firebase**: Já configurado com as credenciais fornecidas
2. **Banco de Dados**: Estrutura de coleções definida (pacientes, profissionais, clínicas, funcionarios, consultas, prontuarios)
3. **Perfis**: Sistema de permissões implementado
4. **Cores**: Tema roxo (#8b5cf6) para médicos/profissionais aplicado

## 🐛 Troubleshooting:

Se encontrar erros ao executar:
1. Certifique-se de que o Node.js está na versão 18+
2. Delete `node_modules` e `package-lock.json` e execute `npm install` novamente
3. Verifique se o Firebase está configurado corretamente no arquivo `src/firebase/config.ts`

