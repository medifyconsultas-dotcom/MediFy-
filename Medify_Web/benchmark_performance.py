#!/usr/bin/env python
"""
Script de benchmark para validar otimizações de performance.
Mede tempos de resposta e chamadas Firestore antes/depois.
"""

import os
import sys
import time
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, str(Path(__file__).parent))
django.setup()

from medify_web.firebase_services import (
    obter_profissional,
    obter_paciente,
    listar_consultas_completas_paciente,
    listar_medicos_clinicas,
)

def benchmark_function(func, *args, iterations=3, description="", **kwargs):
    """Executa função e mede tempo."""
    times = []
    
    print(f"\n{'='*60}")
    print(f"📊 Benchmark: {description or func.__name__}")
    print(f"{'='*60}")
    
    for i in range(iterations):
        start = time.time()
        try:
            result = func(*args, **kwargs)
        except Exception as e:
            print(f"❌ Erro: {e}")
            return None
        
        elapsed = time.time() - start
        times.append(elapsed)
        
        result_info = ""
        if isinstance(result, list):
            result_info = f" ({len(result)} items)"
        elif isinstance(result, dict):
            result_info = f" (dict)"
        elif result is None:
            result_info = " (None)"
        
        print(f"  Iteração {i+1}: {elapsed:.3f}s{result_info}")
    
    avg = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    print(f"\n  📈 Estatísticas:")
    print(f"     Mínimo: {min_time:.3f}s")
    print(f"     Máximo: {max_time:.3f}s")
    print(f"     Média:  {avg:.3f}s")
    
    # Detectar cache hit
    if iterations >= 2 and times[1] < times[0] * 0.5:
        print(f"  💾 ✅ Cache detectado: {times[0]:.3f}s → {times[1]:.3f}s")
    elif iterations >= 2:
        print(f"  💾 ⚠️  Cache pode não estar funcionando")
    
    return times

def main():
    print("\n" + "="*60)
    print("🚀 Teste de Performance - Medify_Web")
    print("="*60)
    print("\nEste script testa o impacto das otimizações.")
    print("Requer dados reais no Firestore.\n")
    
    # Teste 1: obter_profissional (cache simples)
    prof_uid = "test_uid"  # Substituir com UID real
    print("\n⏱️  TESTE 1: obter_profissional()")
    print(f"   UID: {prof_uid}")
    benchmark_function(
        obter_profissional,
        prof_uid,
        iterations=3,
        description="Obter profissional (com cache 300s)"
    )
    
    # Teste 2: obter_paciente (cache simples)
    pac_uid = "test_uid"  # Substituir com UID real
    print("\n⏱️  TESTE 2: obter_paciente()")
    print(f"   UID: {pac_uid}")
    benchmark_function(
        obter_paciente,
        pac_uid,
        iterations=3,
        description="Obter paciente (com cache 300s)"
    )
    
    # Teste 3: listar_medicos_clinicas (cache agregado)
    print("\n⏱️  TESTE 3: listar_medicos_clinicas()")
    benchmark_function(
        listar_medicos_clinicas,
        iterations=3,
        description="Listar médicos de clínicas (com cache 600s)"
    )
    
    # Teste 4: listar_consultas_completas_paciente (consulta complexa)
    pac_uid = "test_uid"  # Substituir com UID real
    print("\n⏱️  TESTE 4: listar_consultas_completas_paciente()")
    print(f"   UID: {pac_uid}")
    benchmark_function(
        listar_consultas_completas_paciente,
        paciente_uid=pac_uid,
        iterations=3,
        description="Listar consultas (com cache 300s + .limit(1000))"
    )
    
    # Resumo
    print("\n" + "="*60)
    print("📊 Interpretação dos Resultados")
    print("="*60)
    
    print("""
✅ Cache funcionando corretamente se:
   - 1ª iteração: 1-3 segundos (primeira leitura)
   - 2ª iteração: <0.1 segundos (hit de cache)
   - 3ª iteração: <0.1 segundos (hit de cache)

⚠️  Sinais de possíveis problemas:
   - Todas iterações levam >2s (cache pode não estar funcionando)
   - 2ª iteração tão lenta quanto 1ª (sem cache)
   - Timeout ou erro (pode ser Firestore lento)

💡 Dicas:
   - Usar UIDs reais do seu banco
   - Executar 2 vezes: primeira sem cache, segunda com cache quente
   - Monitorar Firestore Console durante execução
   - Se lento, verificar índices no Firestore Console
    """)
    
    print("="*60)
    print("✅ Teste concluído!")
    print("="*60)

if __name__ == '__main__':
    main()
