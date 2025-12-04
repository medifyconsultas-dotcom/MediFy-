import os
import tempfile
import types
from io import BytesIO

import pytest

from django.conf import settings

import medify_web.upload_utils as uu


class FakeFile:
    def __init__(self, name, data=b'', content_type=None, size=None):
        self.name = name
        self._data = data
        self.content_type = content_type
        self._pos = 0
        self.size = size if size is not None else len(data)

    def read(self):
        return self._data

    def seek(self, pos):
        self._pos = pos

    def tell(self):
        return self._pos

    def chunks(self):
        yield self._data


def test_validar_foto_none_returns_false():
    ok, msg = uu.validar_foto(None)
    assert ok is False
    assert 'Nenhum arquivo' in msg


def test_validar_foto_size_and_extension_and_mime(monkeypatch):
    # size too large
    big = FakeFile('x.jpg', data=b'0' * (uu.MAX_FILE_SIZE + 1), content_type='image/jpeg')
    ok, msg = uu.validar_foto(big)
    assert ok is False and 'Arquivo muito grande' in msg

    # invalid extension
    small = FakeFile('x.txt', data=b'abc', content_type='text/plain')
    ok2, msg2 = uu.validar_foto(small)
    assert ok2 is False and 'Formato inválido' in msg2

    # invalid mime even with allowed extension
    fake = FakeFile('x.jpg', data=b'abc', content_type='application/octet-stream')
    ok3, msg3 = uu.validar_foto(fake)
    assert ok3 is False and 'Tipo MIME inválido' in msg3


def test_validar_foto_with_pillow_monkeypatch(monkeypatch):
    # Force PIL availability and simulate invalid image
    monkeypatch.setattr(uu, 'PIL_AVAILABLE', True)

    class BadFile(FakeFile):
        def read(self):
            return b'not-an-image'

    bad = BadFile('img.png', data=b'not-an-image', content_type='image/png')
    ok, msg = uu.validar_foto(bad)
    assert ok is False and 'inválido' in msg


def test_salvar_and_delete_media(monkeypatch, tmp_path):
    # setup MEDIA_ROOT and MEDIA_URL
    monkeypatch.setattr(settings, 'MEDIA_ROOT', str(tmp_path))
    monkeypatch.setattr(settings, 'MEDIA_URL', '/media/')

    content = b'hello'
    f = FakeFile('pic.png', data=content, content_type='image/png')

    ok, url = uu.salvar_foto(f, 'profissionais', 'uid123')
    assert ok is True
    assert '/profissionais/' in url

    # path should exist in MEDIA_ROOT
    rel = url.replace(settings.MEDIA_URL.rstrip('/'), '').lstrip('/')
    full = os.path.join(settings.MEDIA_ROOT, rel)
    assert os.path.exists(full)

    # delete by url (relative)
    assert uu.delete_media_by_url(rel) is True
    assert not os.path.exists(full)

    # create file again and delete by absolute url
    ok2, url2 = uu.salvar_foto(FakeFile('pic2.png', data=content, content_type='image/png'), 'pacientes', 'pid')
    assert ok2 is True
    # build absolute url
    absurl = 'http://example.com' + url2
    assert uu.delete_media_by_url(absurl) is True


def test_delete_media_none_returns_true():
    assert uu.delete_media_by_url(None) is True
