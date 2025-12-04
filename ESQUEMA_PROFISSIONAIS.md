# 📋 Esquema: Profissionais Autônomos vs Funcionários de Clínicas

## 🎯 Estrutura de Perfis

### 1. **Profissionais Autônomos** (`perfil: 'profissional'`)
- **Coleção Firestore:** `profissionais`
- **Características:**
  - `idClinica`: `null` ou não existe (NUNCA vinculado a clínica)
  - Trabalham de forma independente
  - Gerenciam sua própria agenda
  - Têm seus próprios pacientes
  - Tipos: Médicos, Enfermeiros, Psicólogos, Fisioterapeutas, etc.

- **Funcionalidades:**
  - ✅ Criar e editar perfil
  - ✅ Gerenciar agenda de consultas
  - ✅ Visualizar prontuários vinculados às suas consultas
  - ✅ Inserir observações nos prontuários
  - ✅ Criar novos prontuários
  - ✅ Editar histórico de observações

- **Acesso:**
  - Dashboard próprio (`DashboardProfissional`)
  - Aba Prontuários (apenas seus prontuários)
  - Aba Consultas (apenas suas consultas)

---

### 2. **Funcionários de Clínicas** (`perfil: 'medico' | 'enfermeiro' | 'recepcionista'`)
- **Coleção Firestore:** `funcionarios`
- **Características:**
  - `idClinica`: **OBRIGATÓRIO** (sempre vinculado a uma clínica)
  - Trabalham para uma clínica específica
  - Gerenciam consultas da clínica
  - Têm acesso aos prontuários da clínica

- **Funcionalidades por Perfil:**

#### Médico/Enfermeiro (`perfil: 'medico' | 'enfermeiro'`)
  - ✅ Dashboard próprio (`DashboardMedicoEnfermeiro`)
  - ✅ Ver consultas da clínica
  - ✅ Ver prontuários próprios OU todos da clínica (toggle)
  - ✅ Criar/editar prontuários
  - ✅ Editar histórico de observações

#### Recepcionista (`perfil: 'recepcionista'`)
  - ✅ Dashboard próprio (`DashboardRecepcionista`)
  - ✅ Agendar consultas
  - ✅ Ver todos os prontuários da clínica
  - ✅ Criar/editar prontuários
  - ✅ Editar histórico de observações

---

## 🔐 Regras de Acesso e Filtros

### Prontuários

| Perfil | Filtro | Descrição |
|--------|--------|-----------|
| `profissional` | `idProfissional == user.id` | Apenas seus próprios prontuários |
| `medico` / `enfermeiro` | `idProfissional == user.id` OU `idClinica == user.idClinica` | Próprios ou todos da clínica (toggle) |
| `recepcionista` | `idClinica == user.idClinica` | Todos os prontuários da clínica |

### Consultas

| Perfil | Filtro | Descrição |
|--------|--------|-----------|
| `profissional` | `idProfissional == user.id` | Apenas suas próprias consultas |
| `medico` / `enfermeiro` | `idProfissional == user.id` | Apenas suas próprias consultas |
| `recepcionista` | `idClinica == user.idClinica` | Todas as consultas da clínica |

---

## 📁 Estrutura de Arquivos

```
src/pages/
├── profissional/
│   └── DashboardProfissional.tsx  ← Dashboard completo para profissionais autônomos
├── medico/
│   └── DashboardMedicoEnfermeiro.tsx  ← Dashboard para médicos/enfermeiros de clínicas
├── recepcionista/
│   └── DashboardRecepcionista.tsx  ← Dashboard para recepcionistas
└── Prontuarios.tsx  ← Página compartilhada (filtra baseado no perfil)
```

---

## ✅ Validações Necessárias

1. **Ao criar profissional autônomo:**
   - `idClinica` deve ser `null` ou não existir
   - `perfil` deve ser `'profissional'`

2. **Ao criar funcionário de clínica:**
   - `idClinica` deve existir e ser válido
   - `perfil` deve ser `'medico'`, `'enfermeiro'` ou `'recepcionista'`
   - `cargo` deve corresponder ao `perfil`

3. **Ao carregar perfil:**
   - Se `perfil === 'profissional'` e `idClinica` existe → remover `idClinica`
   - Se `perfil === 'medico'|'enfermeiro'|'recepcionista'` e `idClinica` não existe → erro

---

## 🎨 Interface do Usuário

### Dashboard Profissional Autônomo
- Cards de estatísticas (consultas hoje, pendentes, realizadas)
- Lista de consultas com filtros (hoje, semana, mês, todas)
- Modal de prontuário ao clicar em consulta
- Funcionalidades completas de CRUD de prontuários

### Menu Lateral
- Dashboard
- Consultas
- Prontuários
- Perfil

---

## 🔄 Fluxo de Dados

### Criar Prontuário (Profissional Autônomo)
```
1. Profissional seleciona consulta
2. Abre modal de prontuário
3. Se não existe prontuário → cria novo
4. Se existe → carrega existente
5. Salva com:
   - idProfissional: user.id
   - idClinica: null
   - nomeProfissional: user.nome
```

### Criar Prontuário (Funcionário de Clínica)
```
1. Médico/Enfermeiro seleciona consulta
2. Abre modal de prontuário
3. Se não existe prontuário → cria novo
4. Se existe → carrega existente
5. Salva com:
   - idProfissional: user.id
   - idClinica: user.idClinica
   - nomeProfissional: user.nome
```

---

## 📝 Notas Importantes

1. **Separação clara:** Profissionais autônomos NUNCA devem ter `idClinica`
2. **Funcionários:** SEMPRE devem ter `idClinica` válido
3. **Prontuários:** Filtrados automaticamente baseado no perfil
4. **Consultas:** Vinculadas ao profissional ou à clínica conforme o caso

