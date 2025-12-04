# 🔗 Integração Django Backend + Electron Frontend

## ✅ O que foi feito:

### 1. ✅ Erro do TypeScript Corrigido
- Corrigido `tsconfig.electron.json` para usar CommonJS corretamente
- Removidas opções incompatíveis (bundler, allowImportingTsExtensions)

### 2. ✅ API REST Criada no Django
Criei endpoints REST em `Medify_Web/medify_web/api_views.py`:

**Endpoints disponíveis:**
- `GET/POST /api/consultas/` - Listar ou criar consultas
- `PATCH /api/consultas/<id>/` - Atualizar consulta
- `GET/POST /api/prontuarios/` - Listar ou criar prontuários
- `PATCH /api/prontuarios/<id>/` - Atualizar prontuário
- `GET /api/funcionarios/?clinica_id=<id>` - Listar funcionários
- `GET /api/pacientes/?search=<termo>` - Listar pacientes
- `GET /api/profissionais/?clinica_id=<id>` - Listar profissionais

### 3. ✅ Script de Seed Atualizado
- Script `scripts/seedData.js` ajustado para usar a mesma estrutura do Django
- Cria consultas em `consultas_clinicas` (como o Django espera)
- Também cria em `consultas` (para compatibilidade com Electron)
- Formato de data compatível: "YYYY-MM-DD HH:MM"

### 4. ✅ Cliente API Criado
- Cliente API em `src/api/client.ts` pronto para usar (opcional)
- Por padrão, o Electron usa Firebase diretamente
- Se quiser usar Django, basta configurar a URL da API

## 🚀 Como Usar:

### Opção 1: Usar Firebase Diretamente (Padrão Atual)
O Electron já está configurado para usar Firebase diretamente. Basta:

```bash
npm run electron
```

### Opção 2: Usar Django Backend

1. **Iniciar o servidor Django:**
```bash
cd Medify_Web
python manage.py runserver
```

2. **Configurar o Electron para usar Django (opcional):**
Edite `src/api/client.ts` e descomente para usar Django ao invés de Firebase direto.

3. **Rodar o Electron:**
```bash
npm run electron
```

## 📊 Script de Seed (Simulação de Uma Semana)

### Criar Dados Simulados:
```bash
npm run seed:data
```

Este script cria:
- ✅ 15 pacientes com dados completos
- ✅ ~14 consultas (7 dias × 2 por dia)
  - Formato compatível com Django: `consultas_clinicas`
  - Também cria em `consultas` para Electron
- ✅ ~2 prontuários por profissional com histórico

### Formato dos Dados:
O script usa o mesmo formato que o Django:
- `consultas_clinicas`: `id_paciente`, `nm_paciente`, `data_consulta` (formato "YYYY-MM-DD HH:MM")
- `consultas`: Formato simplificado para o Electron
- Ambas as coleções são criadas para máxima compatibilidade

## 🔄 Compatibilidade

### Backend Django:
- Usa `consultas_clinicas` e `consultas_autonomos`
- Campos: `id_paciente`, `nm_paciente`, `data_consulta` (string)
- Status capitalizado: "Agendada", "Confirmada", etc.

### Electron (Firebase direto):
- Usa `consultas`
- Campos: `idPaciente`, `nomePaciente`, `dataConsulta` (Timestamp)
- Status lowercase: "agendada", "confirmada", etc.

### Script de Seed:
- Cria em AMBAS as coleções para compatibilidade total
- Funciona com Django E Electron simultaneamente

## 📝 Notas Importantes:

1. **Firebase não foi alterado** - Apenas adicionadas novas coleções/compatibilidade
2. **Django continua funcionando** - Todas as views existentes intactas
3. **Electron funciona independente** - Pode usar Firebase direto OU Django
4. **Script de seed** cria dados compatíveis com ambos

## 🎯 Resultado:

Agora você tem:
- ✅ Electron funcionando (tsconfig corrigido)
- ✅ Django com API REST pronta
- ✅ Script de seed criando dados de uma semana (2x por dia)
- ✅ Dados compatíveis com Django E Electron
- ✅ Sistema funcionando completamente!

