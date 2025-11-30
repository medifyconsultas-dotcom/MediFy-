#!/usr/bin/env python
"""
Script de teste para validar o sistema de upload de fotos.
Executa verificações básicas sem depender de um servidor rodando.
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, str(Path(__file__).parent))
django.setup()

from django.conf import settings
from medify_web.firebase_services import obter_profissional, obter_paciente, obter_clinica

def test_media_structure():
    """Verifica se os diretórios media foram criados."""
    print("🔍 Verificando estrutura de /media...")
    
    paths = [
        os.path.join(settings.MEDIA_ROOT, 'profissionais'),
        os.path.join(settings.MEDIA_ROOT, 'pacientes'),
        os.path.join(settings.MEDIA_ROOT, 'clinicas'),
    ]
    
    for path in paths:
        exists = os.path.isdir(path)
        status = "✅" if exists else "❌"
        print(f"  {status} {path}")
    
    return all(os.path.isdir(p) for p in paths)

def test_firebase_connectivity():
    """Testa conexão com Firestore."""
    print("\n🔍 Testando conectividade Firestore...")
    
    try:
        # Tenta buscar um profissional (pode retornar None, mas não erro)
        result = obter_profissional('test_uid')
        print(f"  ✅ Firestore acessível (resultado esperado: None ou dict)")
        return True
    except Exception as e:
        print(f"  ❌ Erro ao conectar Firestore: {e}")
        return False

def test_settings_media():
    """Verifica configuração de MEDIA_ROOT e MEDIA_URL."""
    print("\n🔍 Verificando configuração de MEDIA em settings...")
    
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    media_url = getattr(settings, 'MEDIA_URL', None)
    
    print(f"  MEDIA_ROOT: {media_root}")
    print(f"  MEDIA_URL: {media_url}")
    
    if media_root and media_url:
        print(f"  ✅ Configuração válida")
        return True
    else:
        print(f"  ❌ Configuração incompleta")
        return False

def test_file_permissions():
    """Testa permissão de escrita nos diretórios."""
    print("\n🔍 Testando permissões de escrita...")
    
    test_paths = [
        os.path.join(settings.MEDIA_ROOT, 'profissionais'),
        os.path.join(settings.MEDIA_ROOT, 'pacientes'),
        os.path.join(settings.MEDIA_ROOT, 'clinicas'),
    ]
    
    all_ok = True
    for path in test_paths:
        try:
            os.makedirs(path, exist_ok=True)
            test_file = os.path.join(path, '.write_test')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print(f"  ✅ {path}")
        except Exception as e:
            print(f"  ❌ {path}: {e}")
            all_ok = False
    
    return all_ok

def main():
    print("=" * 60)
    print("🧪 Teste: Sistema de Upload de Fotos")
    print("=" * 60)
    
    tests = [
        ("Estrutura de /media", test_media_structure),
        ("Configuração MEDIA", test_settings_media),
        ("Permissões de escrita", test_file_permissions),
        ("Conectividade Firestore", test_firebase_connectivity),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Erro ao executar {name}: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("📊 Resumo dos Testes:")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{status}: {name}")
    
    all_passed = all(r for _, r in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ Todos os testes passaram! Sistema pronto para testar.")
    else:
        print("❌ Alguns testes falharam. Verifique os erros acima.")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
