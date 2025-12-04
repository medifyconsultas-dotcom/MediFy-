"""
Utilitários para validação e processamento de uploads de fotos.
"""

import os
import mimetypes
import tempfile
from uuid import uuid4
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

# Constantes de validação
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB em bytes
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp', 'image/svg+xml', 'image/x-icon'}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.raw', '.svg', '.ico', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.TIFF', '.TIF', '.BMP', '.RAW', '.SVG', '.ICO'}

def validar_foto(arquivo):
    """
    Valida arquivo de foto.
    
    Returns:
        (is_valid: bool, error_message: str)
    """
    if not arquivo:
        return False, "Nenhum arquivo fornecido"
    
    # Validar tamanho
    if arquivo.size > MAX_FILE_SIZE:
        size_mb = MAX_FILE_SIZE / (1024 * 1024)
        return False, f"Arquivo muito grande. Máximo: {size_mb:.0f}MB"
    
    
    # Validar extensão com base no nome do ficheiro
    _, ext = os.path.splitext(arquivo.name)
    ext_lower = ext.lower()
    if ext_lower not in ALLOWED_EXTENSIONS:
        allowed_formats = ", ".join(sorted({e.lstrip('.').lower() for e in ALLOWED_EXTENSIONS}))
        return False, f"Formato inválido: {ext}. Formatos permitidos: {allowed_formats}"

    # Validar MIME type (quando disponível no objeto uploaded)
    mime_type = getattr(arquivo, 'content_type', None)
    if not mime_type:
        # fallback: guess from filename
        mime_type, _ = mimetypes.guess_type(arquivo.name)

    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        allowed_mimes = ", ".join(sorted({m.split('/')[-1].upper() for m in ALLOWED_MIME_TYPES}))
        return False, f"Tipo MIME inválido: {mime_type}. Tipos permitidos: {allowed_mimes}"

    # Optional: verify image content using Pillow to avoid corrupted uploads or non-image files
    if PIL_AVAILABLE:
        try:
            # Read a small chunk or the whole file depending on the file-like object
            # We must ensure not to consume the stream for later save; use .read() then seek back if possible
            pos = None
            try:
                pos = arquivo.tell()
            except Exception:
                pos = None
            data = arquivo.read()
            from io import BytesIO
            img = Image.open(BytesIO(data))
            img.verify()
            # restore file pointer for subsequent save
            try:
                arquivo.seek(0)
            except Exception:
                # If seek not supported, we will still attempt to save by rewrapping the bytes
                pass
        except Exception:
            return False, "Arquivo de imagem inválido ou corrompido"

    # Se chegou até aqui, é válido
    return True, ""


def salvar_foto(arquivo, tipo_entidade, entity_id):
    """
    Salva arquivo de foto no diretório apropriado.
    
    Args:
        arquivo: File object from request.FILES
        tipo_entidade: 'profissionais', 'pacientes', ou 'clinicas'
        entity_id: UID ou ID da entidade
    
    Returns:
        (success: bool, media_url_or_error: str)
    """
    try:
        import datetime
        # Build filename using uuid + millisecond timestamp to avoid collisions
        ext = os.path.splitext(arquivo.name)[1] or ''
        ts = int(datetime.datetime.utcnow().timestamp() * 1000)
        unique = uuid4().hex
        filename = f"{entity_id}_{ts}_{unique}{ext}"

        # Use subdir under MEDIA_ROOT
        subdir = os.path.join(settings.MEDIA_ROOT, tipo_entidade)
        os.makedirs(subdir, exist_ok=True)

        dest_path = os.path.join(subdir, filename)

        # Save atomically: write to a temporary file first then replace
        fd, tmp_path = tempfile.mkstemp(prefix="upload_", suffix=ext, dir=subdir)
        os.close(fd)
        try:
            # Write in chunks if provided, or write bytes
            if hasattr(arquivo, 'chunks'):
                with open(tmp_path, 'wb') as out:
                    for chunk in arquivo.chunks():
                        out.write(chunk)
            else:
                # fallback: read whole content
                data = arquivo.read()
                with open(tmp_path, 'wb') as out:
                    out.write(data)

            # Replace atomically
            os.replace(tmp_path, dest_path)

            # Set permissive read permissions
            try:
                os.chmod(dest_path, 0o644)
            except Exception:
                pass

            media_url = settings.MEDIA_URL.rstrip('/') + f"/{tipo_entidade}/{filename}"
            return True, media_url
        finally:
            # cleanup tmp if still exists
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass

    except Exception as e:
        return False, f"Erro ao salvar arquivo: {str(e)}"


def delete_media_by_url(media_url: str) -> bool:
    """Remove o arquivo correspondente a uma media_url relativa em MEDIA_ROOT.

    Returns True if deleted or not found, False on error.
    """
    if not media_url:
        return True
    try:
        # normalize
        media_root = settings.MEDIA_ROOT.rstrip('/\\')
        media_prefix = settings.MEDIA_URL.rstrip('/')
        # If media_url is absolute (with domain), try to extract path
        if media_url.startswith('http'):
            # take path part
            import urllib.parse
            p = urllib.parse.urlparse(media_url).path
            rel = p
        else:
            rel = media_url

        # remove MEDIA_URL prefix if present
        if rel.startswith(media_prefix):
            rel = rel[len(media_prefix):]
        # remove leading slashes
        rel = rel.lstrip('/\\')
        path = os.path.join(media_root, rel)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                return False
        return True
    except Exception:
        return False
