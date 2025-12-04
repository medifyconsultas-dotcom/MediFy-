# 🔥 FASE 2 - Criar Índices Firestore (Copy & Paste)

## ⚡ Quick Action Item

Se você só quer fazer logo, siga este guia rápido (15 minutos).

---

## 🎯 Opção 1: Firebase Console (MAIS FÁCIL)

### Passo 1: Abrir Firebase Console
```
URL: https://console.firebase.google.com
Projeto: medify-401a8 (seu projeto)
Clique em: "Firestore Database" (lado esquerdo)
```

### Passo 2: Ir para Indexes
```
Abas: "Data" | "Queries" | "Indexes" ← CLIQUE AQUI
```

### Passo 3: Criar Primeiro Índice
```
Botão: "Create Index" (azul)
```

Preencha com:
```
Collection ID: consultas
Field 1:
  - Field path: paciente_uid
  - Data type: String
  - Index type: Ascending
Field 2:
  - Field path: status
  - Data type: String
  - Index type: Descending

Clique: "Create Index"
Aguarde: ~5 minutos (status vai de "Creating" → "Enabled")
```

### Passo 4: Repetir 9 Vezes

Clique "Create Index" novamente e crie estes índices (copie-cola campos):

#### Índice 2
```
Collection: consultas
Field 1: paciente_uid (ASC)
Field 2: data (DESC)
```

#### Índice 3
```
Collection: consultas
Field 1: profissional_uid (ASC)
Field 2: data (DESC)
```

#### Índice 4
```
Collection: consultas
Field 1: profissional_uid (ASC)
Field 2: status (DESC)
```

#### Índice 5
```
Collection: consultas_clinicas
Field 1: id_paciente (ASC)
Field 2: status (DESC)
```

#### Índice 6
```
Collection: consultas_clinicas
Field 1: id_profissional (ASC)
Field 2: data (DESC)
```

#### Índice 7
```
Collection: consultas_autonomos
Field 1: id_paciente (ASC)
Field 2: status (DESC)
```

#### Índice 8
```
Collection: consultas_autonomos
Field 1: id_profissional (ASC)
Field 2: data (DESC)
```

#### Índice 9
```
Collection: profissionais
Field 1: especialidade (ASC)
Field 2: nome (ASC)
```

#### Índice 10
```
Collection: pacientes
Field 1: email (ASC)
```

### Passo 5: Validar
Todos os 10 índices devem ter status "Enabled" ✅

---

## 🎯 Opção 2: Arquivo JSON (Para CLI)

Se preferir fazer via CLI:

### Criar arquivo `firestore.indexes.json`
```json
{
  "indexes": [
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "paciente_uid", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "paciente_uid", "order": "ASCENDING"},
        {"fieldPath": "data", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "profissional_uid", "order": "ASCENDING"},
        {"fieldPath": "data", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "profissional_uid", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas_clinicas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "id_paciente", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas_clinicas",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "id_profissional", "order": "ASCENDING"},
        {"fieldPath": "data", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas_autonomos",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "id_paciente", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "consultas_autonomos",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "id_profissional", "order": "ASCENDING"},
        {"fieldPath": "data", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "profissionais",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "especialidade", "order": "ASCENDING"},
        {"fieldPath": "nome", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "pacientes",
      "queryScope": "Collection",
      "fields": [
        {"fieldPath": "email", "order": "ASCENDING"}
      ]
    }
  ]
}
```

### Deploy via CLI
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ Validar Após Criar

### Teste 1: Verificar Índices
```
Firebase Console → Firestore → Indexes
Todos os 10 devem estar "Enabled" (verde)
```

### Teste 2: Executar Benchmark
```bash
cd "/C:\Users\Usuario\Documents\Lab Multi\Medify_Web\Medify_Web"
python benchmark_performance.py
```

Esperado:
```
Iteração 1: 2.5s
Iteração 2: 0.05s  ← Cache hit!
Iteração 3: 0.05s  ← Cache hit!
```

### Teste 3: Verificar Dashboard
```
1. Abrir: http://localhost:8000
2. Login como Paciente
3. Ir para Dashboard
4. Medir tempo de carregamento
5. Esperado: <2 segundos (era 10-15s)
```

---

## 🆘 Se Não Funcionar

### "Index not available"
```
❌ Problema: Index criado mas não está disponível
✅ Solução: Aguardar 5 minutos e recarregar
```

### Query ainda lenta
```
❌ Problema: Index criado mas query lenta
✅ Solução: 
  1. Ir em Firestore → Queries
  2. Procurar por warnings
  3. Firestone vai sugerir índices adicionais
```

### Índice criado errado
```
❌ Problema: Campo errado ou ordem errada
✅ Solução: Deletar e recriar
  1. Firebase Console → Indexes
  2. Clicar no index problemático
  3. Botão "..." → Delete
  4. Recriar com campos corretos
```

---

## 📊 Impacto Esperado

### Antes dos Índices
```
Query: paciente_uid + status
Tempo: 2-5 segundos
Documentos lidos: 1000+
```

### Depois dos Índices
```
Query: paciente_uid + status
Tempo: 50-200ms
Documentos lidos: <100
Melhoria: 10-100x mais rápido
```

---

## 📝 Checklist

- [ ] Índice 1: consultas (paciente_uid + status) ✅
- [ ] Índice 2: consultas (paciente_uid + data)
- [ ] Índice 3: consultas (profissional_uid + data)
- [ ] Índice 4: consultas (profissional_uid + status)
- [ ] Índice 5: consultas_clinicas (id_paciente + status)
- [ ] Índice 6: consultas_clinicas (id_profissional + data)
- [ ] Índice 7: consultas_autonomos (id_paciente + status)
- [ ] Índice 8: consultas_autonomos (id_profissional + data)
- [ ] Índice 9: profissionais (especialidade + nome)
- [ ] Índice 10: pacientes (email)

Todos "Enabled": [ ]

---

## ⏱️ Tempo Estimado

- Criar índices: 10 minutos (click-click-click)
- Aguardar criação: 15 minutos (deixar rodando)
- Validar: 5 minutos
- **Total:** 30 minutos

---

## 🚀 Próximo Passo

Depois dos índices:
1. Executar `benchmark_performance.py`
2. Testar manualmente no navegador
3. Verificar Firestore usage no console
4. Comemorar a velocidade! 🎉

---

**Pronto? Vá para Firebase Console agora!**
https://console.firebase.google.com

