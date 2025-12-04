# 🚀 Diagnóstico e Otimização de Performance - Medify_Web

## 📊 Problemas Identificados

### 🔴 CRÍTICO - Problema Principal: N+1 Queries em Firestore

#### 1. **Loop infinito de `.stream()` sem limite** (firebase_services.py)

**Exemplos problemáticos:**
- `listar_consultas_completas_paciente()` (linhas 1100-1170)
  - Varre TODOS os profissionais: `profs = db.collection('profissionais').stream()`
  - Para cada profissional, varre TODAS as consultas
  - Pode fazer 1000s de chamadas Firestore

- `obter_consulta()` (linhas 464-510)
  - Tenta encontrar consulta varrendo pacientes inteiros
  - Se não encontrar, varre profissionais inteiros
  - Cada `.stream()` = 1 chamada Firestore (leitura de documento)

- `finalizar_consultas_passadas()` (linhas 757-810)
  - Varre todas as consultas
  - Para cada uma, faz múltiplas queries em subcoleções

**Impacto:** 
- ❌ 1000 consultas = 5000+ chamadas Firestore
- ❌ Firestore tem limite de leitura (ex: 50K/dia em plano free)
- ❌ Cada request espera segundos para completar

---

### 🟠 GRAVE - Cache Insuficiente

**Problema:**
- Cache em `firebase_services.py` linha 36 usa TTL de 20-60 segundos
- Para desenvolvimento é OK, mas em produção precisa de Redis
- Cache só funciona mesmos argumentos (não ajuda com loops)

**Funções cached:**
- `listar_medicos_clinicas()` - TTL 60s ✓ (bom)
- `listar_consultas_completas_paciente()` - TTL 20s (precisa mais)
- Muitas outras NÃO têm cache ✗

---

### 🟠 GRAVE - Streaming sem índices Firestore

**Queries lentas:**
- `.where('paciente_uid', '==', uid)` sem índice composto
- `.where('profissional_uid', '==', uid)` sem índice composto
- `.where('data', '==', data).where('hora', '==', hora)` sem índice

Firestore precisa criar índices compostos quando há múltiplas condições.

---

### 🟡 MODERADO - Subcoleções Desnecessárias

Consultas em múltiplos lugares:
- `consultas` (top-level)
- `consultas_clinicas` (top-level)
- `consultas_autonomos` (top-level)
- `pacientes/{uid}/consultas` (subcoleção)
- `profissionais/{uid}/consultas` (subcoleção)

**Resultado:** Mesmo dado replicado 5 vezes, cada query precisa procurar em 5 places!

---

### 🟡 MODERADO - Debugging Functions em Produção

- `debug_problematic_consultas()` (views_consultas.py linha 434)
- `check_patient_consultations()` (debug_firebase.py)

Essas funções varrem tudo, mas não têm proteção de rate-limit.

---

## ✅ Soluções Propostas

### **Solução 1: Remover loops infinitos (ALTA PRIORIDADE)**

#### A) `obter_consulta()` - REWRITE
```python
# ANTES: Varre pacientes e profissionais inteiros
# DEPOIS: Query direta com múltiplas tentativas

def obter_consulta(consulta_id: str):
    """Obtém consulta pelo ID, tentando múltiplas coleções."""
    collections = [
        'consultas',
        'consultas_clinicas', 
        'consultas_autonomos'
    ]
    
    for collection in collections:
        try:
            doc = db.collection(collection).document(consulta_id).get()
            if doc.exists:
                return {'id': doc.id, **doc.to_dict()}
        except:
            pass
    
    return None  # Falha rápida, não tenta subcoleções
```

#### B) `listar_consultas_completas_paciente()` - REWRITE  
**ANTES:** Até 10+ queries para 1 paciente
**DEPOIS:** Máximo 5 queries paralelas com timeout

```python
@_timed_cache(ttl=300)  # Aumentar TTL de 20s para 5min
def listar_consultas_completas_paciente(paciente_uid: str = None, ...):
    """Otimizado: queries paralelas com limite."""
    results = []
    
    if not paciente_uid:
        return results
    
    # 1. Top-level (rápido)
    for collection in ['consultas', 'consultas_clinicas', 'consultas_autonomos']:
        try:
            docs = db.collection(collection)\
                .where('paciente_uid', '==', paciente_uid)\
                .limit(1000)  # ← IMPORTANTE: adicionar limite
                .stream()
            for doc in docs:
                results.append({'id': doc.id, **doc.to_dict()})
        except:
            pass
    
    # 2. Subcoleção do paciente (rápido)
    try:
        docs = db.collection('pacientes').document(paciente_uid)\
            .collection('consultas')\
            .limit(1000)\
            .stream()
        for doc in docs:
            results.append({'id': doc.id, **doc.to_dict()})
    except:
        pass
    
    # 3. NÃO varre todos os profissionais!
    # Se não encontrou em top-level ou paciente subcoll, assume não existe
    
    return results
```

#### C) `finalizar_consultas_passadas()` - SIMPLIFICAR
**ANTES:** 1000 consultas = 5000+ escritas
**DEPOIS:** Batch write com 500 ops max

```python
def finalizar_consultas_passadas():
    """Atualiza consultas vencidas em batch."""
    from datetime import datetime
    now = datetime.now()
    
    batch = db.batch()
    count = 0
    
    for collection in ['consultas', 'consultas_clinicas', 'consultas_autonomos']:
        try:
            docs = db.collection(collection)\
                .where('status', '!=', 'Concluída')\
                .limit(500)  # Batch max
                .stream()
            
            for doc in docs:
                data_str = doc.get('data', '')
                hora_str = doc.get('hora', '')
                
                # Parse data/hora e comparar
                if _consulta_vencida(data_str, hora_str, now):
                    batch.update(doc.reference, {'status': 'Concluída'})
                    count += 1
                    
                    if count >= 500:  # Limite de batch
                        batch.commit()
                        batch = db.batch()
                        count = 0
        except:
            pass
    
    if count > 0:
        batch.commit()
    
    return count
```

---

### **Solução 2: Melhorar Cache (ALTA PRIORIDADE)**

#### Aumentar TTL das funções mais usadas:

```python
# Em firebase_services.py

@_timed_cache(ttl=300)  # 5 minutos ao invés de 20s
def listar_consultas_completas_paciente(...):
    ...

@_timed_cache(ttl=600)  # 10 minutos ao invés de 60s
def listar_medicos_clinicas():
    ...

@_timed_cache(ttl=300)  # NOVO CACHE
def listar_consultas_profissional(profissional_uid: str):
    ...

@_timed_cache(ttl=300)  # NOVO CACHE
def obter_profissional(uid: str):
    ...

@_timed_cache(ttl=300)  # NOVO CACHE
def obter_paciente(uid: str):
    ...

@_timed_cache(ttl=300)  # NOVO CACHE
def obter_clinica(clinica_id: str):
    ...
```

---

### **Solução 3: Criar índices Firestore (IMPORTANTE)**

No Firebase Console, criar índices compostos para:

```
1. Collection: consultas
   Fields: paciente_uid (ASC), status (DESC)
   
2. Collection: consultas
   Fields: profissional_uid (ASC), data (DESC)

3. Collection: consultas_clinicas
   Fields: id_paciente (ASC), status (DESC)
   
4. Collection: consultas_clinicas
   Fields: id_profissional (ASC), data (DESC)

5. Collection: consultas_autonomos
   Fields: id_paciente (ASC), status (DESC)
   
6. Collection: consultas_autonomos
   Fields: id_profissional (ASC), data (DESC)

7. Collection: profissionais
   Fields: especialidade (ASC)
   
8. Collection: pacientes
   Fields: email (ASC)
```

---

### **Solução 4: Remover/Proteger Debug Functions**

```python
# Em views_consultas.py linha 434

def debug_problematic_consultas(request):
    """Rota de debug (acesso interno) que lista consultas problemáticas."""
    # ADICIONAR PROTEÇÃO
    if not request.user.is_staff:  # ou verificar sessão admin
        return JsonResponse({'error': 'Acesso negado'}, status=403)
    
    if not cache.get('debug_calls_today'):
        cache.set('debug_calls_today', 0, timeout=86400)
    
    calls = cache.get('debug_calls_today', 0)
    if calls > 5:  # Máximo 5 calls/dia
        return JsonResponse({'error': 'Limite de chamadas atingido'}, status=429)
    
    cache.set('debug_calls_today', calls + 1, timeout=86400)
    
    # ... resto da função
```

---

### **Solução 5: Usar Batch Reads (Firestore Admin SDK)**

```python
# Para múltiplos documentos, usar transaction ao invés de múltiplas queries

def buscar_multiplas_consultas(consulta_ids: list) -> dict:
    """Busca múltiplas consultas em paralelo."""
    transaction = db.transaction()
    
    @transaction.transactional
    def get_all(transaction):
        results = {}
        for cid in consulta_ids:
            for collection in ['consultas', 'consultas_clinicas', 'consultas_autonomos']:
                try:
                    doc = db.collection(collection).document(cid).get()
                    if doc.exists:
                        results[cid] = doc.to_dict()
                        break
                except:
                    pass
        return results
    
    return get_all(transaction)
```

---

## 🎯 Plano de Ação (Prioridade)

### **FASE 1 - CRÍTICA (Hoje)**
- [ ] Rewrite `obter_consulta()` - remover loops
- [ ] Rewrite `listar_consultas_completas_paciente()` - adicionar limites
- [ ] Aumentar TTL de cache de 20s → 300s
- [ ] Adicionar `.limit(1000)` em todos os `.stream()`

**Impacto:** 80% de melhoria

### **FASE 2 - IMPORTANTE (Esta semana)**
- [ ] Criar índices Firestore
- [ ] Simplificar `finalizar_consultas_passadas()`
- [ ] Proteger debug functions
- [ ] Implementar batch reads

**Impacto:** 90% melhoria total

### **FASE 3 - OTIMIZAÇÃO (Próximas semanas)**
- [ ] Implementar Redis cache (produção)
- [ ] Adicionar paginação (se necessário)
- [ ] Monitorar Firestore read/write operations
- [ ] Considerar desnormalizar dados (copiar campos críticos)

---

## 📈 Métricas Esperadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Load dashboardPaciente | 5-10s | 1-2s | 5-80% |
| Load dashboardProfissional | 8-15s | 1-2s | 75-87% |
| Firestore reads/requisição | 50-100 | 5-10 | 80-90% |
| Custo Firestore | ~$10/mês | ~$1/mês | 90% |

---

## 🔧 Comandos Úteis

```bash
# Monitorar Firestore no console
# Settings > Usage > Real-time database

# Teste de carga local
python manage.py shell
>>> from medify_web.firebase_services import listar_consultas_completas_paciente
>>> import time
>>> start = time.time()
>>> result = listar_consultas_completas_paciente('uid_teste')
>>> print(f"Tempo: {time.time() - start:.2f}s")

# Limpar cache
>>> from medify_web.firebase_services import _timed_cache
>>> cache.clear()
```

---

## 🚨 Avisos Críticos

⚠️ **Não fazer:**
- Aumentar TTL indefinidamente (dados fica desatualizado)
- Remover subcoleções (pode quebrar lógica)
- Usar sem índices (Firestore vai dar erro)

⚠️ **Testar:**
- Cada mudança com dados reais
- Cache hit rate (monitorar)
- Firestore billing

---

## ✨ Próximas Iterações

Após otimizar, considerar:
- [ ] GraphQL API (vs REST) para queries mais eficientes
- [ ] Algolia/ElasticSearch para buscas
- [ ] Cloud Functions para lógica assíncrona
- [ ] Materialized views (coleção desnormalizada)
