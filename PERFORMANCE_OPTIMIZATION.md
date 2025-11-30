REMOVIDO - ARQUIVADO: este arquivo foi limpo para deploy. Consulte o histórico Git para o conteúdo original.
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

REMOVIDO - ARQUIVADO: este arquivo foi limpo para deploy. Consulte o histórico Git para o conteúdo original.

