# 📋 TODO - Backend Mobile Medify

## ✅ Concluído

- [x] Estrutura de pastas do backend
- [x] Configuração do package.json
- [x] Configuração do Firebase Admin SDK
- [x] Middleware de autenticação
- [x] Rotas de autenticação (login, cadastro, verify)
- [x] Controllers para Paciente
- [x] Controllers para Profissional
- [x] Controllers para Admin
- [x] Validações com Joi
- [x] Utilitários (response, validators)
- [x] Estrutura básica de testes
- [x] Documentação README

## 🔄 Em Progresso

- [ ] Configurar variáveis de ambiente no projeto
- [ ] Testar todas as rotas manualmente
- [ ] Completar testes unitários

## 📝 Pendente

### Autenticação
- [ ] Implementar refresh token
- [ ] Adicionar rate limiting nas rotas de auth
- [ ] Implementar recuperação de senha
- [ ] Adicionar verificação de email

### Paciente
- [ ] Implementar busca de clínicas disponíveis
- [ ] Implementar busca de profissionais disponíveis
- [ ] Adicionar filtros no histórico (por data, status)
- [ ] Implementar cancelamento de consulta
- [ ] Adicionar notificações push para consultas
- [ ] Implementar upload de documentos (exames, etc)

### Profissional
- [ ] Implementar busca de pacientes
- [ ] Adicionar filtros nas consultas (por data, status, paciente)
- [ ] Implementar edição de observações no histórico
- [ ] Adicionar upload de anexos no prontuário
- [ ] Implementar relatórios de consultas
- [ ] Adicionar disponibilidade de horários

### Admin
- [ ] Implementar exclusão de clínicas
- [ ] Implementar exclusão de profissionais
- [ ] Adicionar listagem de pacientes
- [ ] Implementar relatórios gerais
- [ ] Adicionar gestão de funcionários
- [ ] Implementar logs de auditoria

### Validações
- [ ] Adicionar validação de CPF
- [ ] Adicionar validação de CNPJ
- [ ] Adicionar validação de telefone
- [ ] Adicionar validação de CEP
- [ ] Validar conflitos de horário mais robustamente
- [ ] Validar disponibilidade do profissional

### Testes
- [ ] Testes completos para authController
- [ ] Testes completos para pacienteController
- [ ] Testes completos para profissionalController
- [ ] Testes completos para adminController
- [ ] Testes de integração end-to-end
- [ ] Testes de performance
- [ ] Testes de segurança (SQL injection, XSS, etc)

### Segurança
- [ ] Implementar CORS mais restritivo
- [ ] Adicionar helmet.js para headers de segurança
- [ ] Implementar rate limiting global
- [ ] Adicionar validação de input sanitization
- [ ] Implementar logging de segurança
- [ ] Adicionar proteção contra CSRF

### Performance
- [ ] Implementar cache para consultas frequentes
- [ ] Otimizar queries do Firestore (índices)
- [ ] Implementar paginação eficiente
- [ ] Adicionar compressão de respostas
- [ ] Implementar lazy loading onde necessário

### Documentação
- [ ] Adicionar Swagger/OpenAPI
- [ ] Documentar todos os endpoints
- [ ] Adicionar exemplos de requisições/respostas
- [ ] Criar guia de deploy
- [ ] Documentar variáveis de ambiente

### DevOps
- [ ] Configurar CI/CD
- [ ] Adicionar Dockerfile
- [ ] Configurar docker-compose para desenvolvimento
- [ ] Adicionar scripts de deploy
- [ ] Configurar monitoramento (Sentry, etc)
- [ ] Adicionar health checks mais detalhados

### Features Extras
- [ ] Implementar sistema de notificações push
- [ ] Adicionar integração com calendário
- [ ] Implementar chat entre paciente e profissional
- [ ] Adicionar sistema de avaliações
- [ ] Implementar lembretes de consulta
- [ ] Adicionar integração com pagamentos
- [ ] Implementar telemedicina (vídeo chamadas)

### Melhorias
- [ ] Adicionar suporte a múltiplos idiomas
- [ ] Implementar versionamento de API
- [ ] Adicionar suporte a timezone
- [ ] Melhorar tratamento de erros
- [ ] Adicionar métricas e analytics
- [ ] Implementar backup automático

## 🐛 Bugs Conhecidos

- [ ] Verificar se todas as queries do Firestore têm índices necessários
- [ ] Validar se o tratamento de erros está completo em todos os controllers
- [ ] Verificar se as validações de data estão corretas em todos os fusos horários

## 📌 Notas

- O backend usa Firebase Admin SDK para autenticação e Firestore
- Todas as rotas (exceto auth) requerem autenticação via Bearer Token
- Os testes precisam de um projeto Firebase de teste configurado
- As validações usam Joi para schema validation
- O sistema suporta três perfis: paciente, profissional, admin

