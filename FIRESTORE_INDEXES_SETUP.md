REMOVIDO - ARQUIVADO: este arquivo foi limpo para deploy. Consulte o histórico Git para o conteúdo original.

## ⚠️ Por que Índices são Importantes?

Firestore automaticamente cria índices para queries simples (1 campo).  
Para queries **compostas** (2+ campos com `.where()`), você precisa criar índices manualmente.

**Sem índice composto:**
- ❌ Query falha com erro "Index not available"
- ❌ Firestore sugere criar índice

**Com índice composto:**
- ✅ Query é executada em milissegundos
- ✅ Até 1000% mais rápida

---

## 📝 Índices Recomendados

### **Grupo 1: Consultas por Paciente (CRÍTICO)**

```
Collection: consultas
Fields:
  - paciente_uid (ASC)
  - status (DESC)

Collection: consultas
Fields:
  - paciente_uid (ASC)
  - data (DESC)
```

**Uso:** Dashboard de paciente, agendamento

---

### **Grupo 2: Consultas por Profissional**

```
Collection: consultas
Fields:
  - profissional_uid (ASC)
  - data (DESC)

Collection: consultas
Fields:
  - profissional_uid (ASC)
  - status (DESC)
```

**Uso:** Agenda do profissional

---

### **Grupo 3: Consultas Clínicas**

```
Collection: consultas_clinicas
Fields:
  - id_paciente (ASC)
  - status (DESC)

Collection: consultas_clinicas
Fields:
  - id_profissional (ASC)
  - data (DESC)

Collection: consultas_autonomos
Fields:
  - id_paciente (ASC)
  - status (DESC)

Collection: consultas_autonomos
Fields:
  - id_profissional (ASC)
  - data (DESC)
```

**Uso:** Consultas em clínicas e autônomos

---

### **Grupo 4: Buscas Gerais (OPCIONAL)**

```
Collection: profissionais
Fields:
  - especialidade (ASC)
  - nome (ASC)

Collection: pacientes
Fields:
  - email (ASC)

Collection: clinicas
Fields:
  - nome (ASC)
```

**Uso:** Listagem de médicos, busca de usuários

---

## 🛠️ Como Criar Índices (3 opções)

### **OPÇÃO 1: Firebase Console (Recomendado para iniciantes)**

1. **Abrir Firebase Console:**
   - URL: https://console.firebase.google.com
   - Projeto: `medify-401a8` (ou seu projeto)

2. **Navegar para Firestore:**
   - Menu esquerdo → Firestore Database

3. **Ir para Índices:**
   - Abas no topo: "Data" → "Indexes"

4. **Clicar em "Create Index":**
   - Collection: `consultas`
   - Campo 1: `paciente_uid` (ASC)
   - Campo 2: `status` (DESC)
   - Clicar "Create Index"

5. **Aguardar:**
   - Status muda de "Creating" → "Enabled" (~5-15min)
   - Índice está pronto!

6. **Repetir** para outros índices

---

### **OPÇÃO 2: Firestore CLI (Para desenvolvedores)**

```bash
# Instalar Firebase CLI (se ainda não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Listar índices atuais
firebase firestore:indexes

# Criar índice via JSON (cria arquivo local)
# Arquivo: firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "paciente_uid", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "paciente_uid", "order": "ASCENDING" },
        { "fieldPath": "data", "order": "DESCENDING" }
      ]
    }
    # ... mais índices aqui
  ]
}

# Fazer deploy
firebase deploy --only firestore:indexes
```

---

### **OPÇÃO 3: API REST (Para integração)**

```bash
# Listar índices
curl -X GET \
  'https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/default/indexes' \
  -H 'Authorization: Bearer ACCESS_TOKEN'

# Criar índice
curl -X POST \
  'https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/default/indexes' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "fields": [
      {
        "fieldPath": "paciente_uid",
        "order": "ASCENDING"
      },
      {
        "fieldPath": "status",
        "order": "DESCENDING"
      }
    ]
  }'
```

---

## ✅ Checklist de Índices

- [ ] **Crítico 1:** consultas + paciente_uid + status
- [ ] **Crítico 2:** consultas + paciente_uid + data
- [ ] **Crítico 3:** consultas + profissional_uid + data
- [ ] **Crítico 4:** consultas + profissional_uid + status
- [ ] **Importante 5:** consultas_clinicas + id_paciente + status
- [ ] **Importante 6:** consultas_autonomos + id_paciente + status
- [ ] **Importante 7:** consultas_clinicas + id_profissional + data
- [ ] **Importante 8:** consultas_autonomos + id_profissional + data
- [ ] **Opcional 9:** profissionais + especialidade + nome
- [ ] **Opcional 10:** pacientes + email

---

## 🚀 Validar Índices

### **Verificar no Console:**
1. Firestore → Indexes
2. Procurar por índices criados
3. Status deve ser "Enabled" (verde)

### **Verificar via Query:**
No Django shell:
```python
from medify_web.firebase_services import listar_consultas_completas_paciente
import time

start = time.time()
result = listar_consultas_completas_paciente(paciente_uid='seu_uid')
print(f"Com índice: {time.time()-start:.3f}s")  # Deve ser <0.5s
```

### **Monitorar Latência:**
Firestore Console → Usage:
- Antes: latência média 1-3s
- Depois: latência média <100ms

---

## 🆘 Troubleshooting

### **Erro: "Index not available"**
```
❌ Problema: Query tentou usar índice que não existe
✅ Solução: Criar o índice (Firestore vai sugerir automaticamente)
```

### **Índice demora muito para criar**
```
❌ Problema: Pode levar 5-30 min dependendo do tamanho da collection
✅ Solução: Aguardar pacientemente (não precisa fazer nada)
           Status no console: "Creating" → "Enabled"
```

### **Query ainda está lenta mesmo com índice**
```
❌ Problema 1: Índice criado mas não está sendo usado (cache do navegador)
✅ Solução: Aguardar 5min e recarregar página

❌ Problema 2: Query ainda lê muitos documentos
✅ Solução: Adicionar .limit() maior em firebase_services.py

❌ Problema 3: Firestore está limitado (quota)
✅ Solução: Upgrade do plano ou reduzir queries
```

---

## 📊 Impacto Esperado dos Índices

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Tempo query | 2-5s | 50-200ms | ⚡ 10-100x |
| Leitura documentos | 1000-5000 | 10-100 | 💰 99% redução |
| Custo | $10/mês | $0.5/mês | 💵 95% economia |

---

## 🎯 Próximas Fases (Após Índices)

Depois de criar índices, pode passar para:
- **FASE 3:** Implementar Redis (cache distribuído)
- **FASE 4:** Desnormalizar dados críticos
- **FASE 5:** Cloud Functions para processamento assíncrono

---

## 📞 Dúvidas Comuns

### **P: Preciso deletar índices antigos?**
R: Não, não há custo. Mas se não usar, pode deletar via Console.

### **P: Quantos índices posso criar?**
R: Até 500 índices (limite Firestore). Para a maioria dos projetos, 10-20 é suficiente.

### **P: Índices funcionam em desenvolvimento?**
R: Sim, funcionam tanto em dev como produção.

### **P: Posso criar índices via código Python?**
R: Não diretamente, mas pode via CLI ou Console.

---

## ✨ Resumo Rápido

1. **Abrir:** Firebase Console → Firestore → Indexes
2. **Criar:** 10 índices conforme lista acima
3. **Aguardar:** ~15 minutos para todos ficarem "Enabled"
4. **Testar:** Executar `benchmark_performance.py`
5. **Monitorar:** Verificar latência no Console

**Estimado:** 30 min total (15 min criando + 15 min aguardando)

---

**Status:** ⏸️ FASE 2 - Aguardando implementação manual  
**Prioridade:** 🔴 ALTA - Faz 10x diferença  
**Esforço:** 15 minutos no console
