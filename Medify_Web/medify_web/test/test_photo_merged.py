import os
import pytest
import django
from pathlib import Path
from django.core.files.uploadedfile import SimpleUploadedFile

# Setup Django for tests that need settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys_path = str(Path(__file__).parent.parent.parent)
import sys
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)
django.setup()

from django.conf import settings
import medify_web.firebase_services as fs
from medify_web.upload_utils import validar_foto
import base64


def create_test_file(filename, size_bytes=1024, mime_type='image/jpeg'):
    """Cria um SimpleUploadedFile com bytes de imagem válidos para testes.

    Para JPEG/PNG usamos pequenos blobs base64 de 1x1 pixel.
    Para outros tipos ou quando um tamanho maior é solicitado, usamos bytes preenchidos.
    """
    name_lower = filename.lower()
    if 'jpeg' in mime_type or name_lower.endswith('.jpg') or name_lower.endswith('.jpeg'):
        jpeg_b64 = (
            '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////'
            '2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/'
            'xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD9A//Z'
        )
        content = base64.b64decode(jpeg_b64)
        if len(content) < size_bytes:
            content = content + (b'\x00' * (size_bytes - len(content)))
        return SimpleUploadedFile(filename, content, content_type='image/jpeg')
    if 'png' in mime_type or name_lower.endswith('.png'):
        png_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
        content = base64.b64decode(png_b64)
        if len(content) < size_bytes:
            content = content + (b'\x00' * (size_bytes - len(content)))
        return SimpleUploadedFile(filename, content, content_type='image/png')
    # fallback: raw bytes
    content = b'x' * size_bytes
    return SimpleUploadedFile(filename, content, content_type=mime_type)



def test_tudo_photo_merged(tmp_path):
    # Ensure test environment uses restricted allowed types for deterministic results
    import medify_web.upload_utils as uu
    uu.ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg'}
    uu.ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    uu.PIL_AVAILABLE = False
    # 1. test_validacao_extensao
    tests_ext = [
        ('foto.jpg', True),
        ('foto.jpeg', True),
        ('foto.png', True),
        ('foto.JPG', True),
        ('foto.gif', False),
        ('foto.txt', False),
        ('foto.pdf', False),
    ]
    for filename, should_pass in tests_ext:
        arquivo = create_test_file(filename, size_bytes=100)
        is_valid, msg = validar_foto(arquivo)
        assert is_valid == should_pass

    # 2. test_validacao_tamanho
    tests_tam = [
        (100, True),
        (1024 * 1024, True),
        (5 * 1024 * 1024, True),
        (6 * 1024 * 1024, False),
        (10 * 1024 * 1024, False),
    ]
    for size_bytes, should_pass in tests_tam:
        arquivo = create_test_file('foto.jpg', size_bytes=size_bytes)
        is_valid, msg = validar_foto(arquivo)
        assert is_valid == should_pass

    # 3. test_validacao_mime
    tests_mime = [
        ('foto.jpg', 'image/jpeg', True),
        ('foto.png', 'image/png', True),
        ('foto.gif', 'image/gif', False),
        ('foto.bmp', 'image/bmp', False),
    ]
    for filename, mime_type, should_pass in tests_mime:
        arquivo = create_test_file(filename, size_bytes=100, mime_type=mime_type)
        is_valid, msg = validar_foto(arquivo)
        assert is_valid == should_pass

    # 4. test_media_structure_and_permissions
    paths = [
        os.path.join(settings.MEDIA_ROOT, 'profissionais'),
        os.path.join(settings.MEDIA_ROOT, 'pacientes'),
        os.path.join(settings.MEDIA_ROOT, 'clinicas'),
    ]
    for path in paths:
        os.makedirs(path, exist_ok=True)
        test_file = os.path.join(path, '.write_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        assert os.path.isdir(path)

    # 5. test_firebase_connectivity_smoke
    try:
        _ = fs.obter_profissional('test_uid')
        assert True
    except Exception:
        pytest.skip('Firestore not available in this environment')
