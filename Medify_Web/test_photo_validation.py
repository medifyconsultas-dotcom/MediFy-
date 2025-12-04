#!/usr/bin/env python
"""
Script de teste para validação de upload de fotos.
Testa as funções de validação sem precisar fazer upload real.
"""

import os
import sys
import django
from pathlib import Path
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, str(Path(__file__).parent))
django.setup()

from medify_web.upload_utils import validar_foto, MAX_FILE_SIZE, ALLOWED_EXTENSIONS

def create_test_file(filename, size_bytes=1024, mime_type='image/jpeg'):
    """Cria um arquivo de teste fake."""
    content = b'x' * size_bytes
    return SimpleUploadedFile(filename, content, content_type=mime_type)

def test_validacao_extensao():
    """Testa validação de extensão de arquivo."""
    print("\n📋 Teste: Validação de Extensão")
    
    tests = [
        ('foto.jpg', True, "JPG válido"),
        ('foto.jpeg', True, "JPEG válido"),
        ('foto.png', True, "PNG válido"),
        ('foto.JPG', True, "JPG maiúsculo válido"),
        ('foto.gif', False, "GIF não permitido"),
        ('foto.txt', False, "TXT não permitido"),
        ('foto.pdf', False, "PDF não permitido"),
    ]
    
    for filename, should_pass, description in tests:
        arquivo = create_test_file(filename, size_bytes=100)
        is_valid, msg = validar_foto(arquivo)
        status = "✅" if is_valid == should_pass else "❌"
        print(f"  {status} {description}: {filename}")
        if is_valid != should_pass:
            print(f"      Esperado: {should_pass}, Obtido: {is_valid}")
            print(f"      Mensagem: {msg}")

def test_validacao_tamanho():
    """Testa validação de tamanho de arquivo."""
    print("\n📋 Teste: Validação de Tamanho")
    
    tests = [
        (100, True, "100 bytes (muito pequeno, mas válido)"),
        (1024 * 1024, True, "1 MB (válido)"),
        (5 * 1024 * 1024, True, "5 MB (limite máximo)"),
        (6 * 1024 * 1024, False, "6 MB (acima do limite)"),
        (10 * 1024 * 1024, False, "10 MB (muito grande)"),
    ]
    
    for size_bytes, should_pass, description in tests:
        arquivo = create_test_file('foto.jpg', size_bytes=size_bytes)
        is_valid, msg = validar_foto(arquivo)
        status = "✅" if is_valid == should_pass else "❌"
        print(f"  {status} {description}")
        if is_valid != should_pass:
            print(f"      Esperado: {should_pass}, Obtido: {is_valid}")
            print(f"      Mensagem: {msg}")

def test_validacao_mime():
    """Testa validação de MIME type."""
    print("\n📋 Teste: Validação de MIME Type")
    
    tests = [
        ('foto.jpg', 'image/jpeg', True, "JPEG válido"),
        ('foto.png', 'image/png', True, "PNG válido"),
        ('foto.gif', 'image/gif', False, "GIF não permitido"),
        ('foto.bmp', 'image/bmp', False, "BMP não permitido"),
    ]
    
    for filename, mime_type, should_pass, description in tests:
        arquivo = create_test_file(filename, size_bytes=100, mime_type=mime_type)
        is_valid, msg = validar_foto(arquivo)
        status = "✅" if is_valid == should_pass else "❌"
        print(f"  {status} {description}")
        if is_valid != should_pass:
            print(f"      Esperado: {should_pass}, Obtido: {is_valid}")
            print(f"      Mensagem: {msg}")

def test_validacao_arquivo_nulo():
    """Testa validação com arquivo nulo."""
    print("\n📋 Teste: Arquivo Nulo")
    
    is_valid, msg = validar_foto(None)
    status = "✅" if not is_valid else "❌"
    print(f"  {status} Arquivo None rejeitado")
    if is_valid:
        print(f"      Esperado: False, Obtido: {is_valid}")

def main():
    print("=" * 60)
    print("🧪 Teste: Validação de Upload de Fotos")
    print("=" * 60)
    
    print(f"\n📌 Configurações de Validação:")
    print(f"  Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024):.0f} MB")
    print(f"  Extensões permitidas: {', '.join(ALLOWED_EXTENSIONS)}")
    
    try:
        test_validacao_arquivo_nulo()
        test_validacao_extensao()
        test_validacao_tamanho()
        test_validacao_mime()
        
        print("\n" + "=" * 60)
        print("✅ Todos os testes de validação completados!")
        print("=" * 60)
        return 0
    except Exception as e:
        print(f"\n❌ Erro durante testes: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
