import time
import types
import pytest

import medify_web.firebase_services as fs


class FakeResp:
    def __init__(self, data):
        self._data = data

    def json(self):
        return self._data


def test_enviar_email_redefinicao_and_alterar_senha_error(monkeypatch):
    # enviar_email_redefinicao returns resp.json()
    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=lambda url, json: FakeResp({'ok': True, 'url': url})))
    out = fs.enviar_email_redefinicao('x@y.com')
    assert isinstance(out, dict) and out.get('ok') is True

    # alterar_senha_com_token handles request exceptions
    def raise_post(url, json):
        raise Exception('boom')

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=raise_post))
    res = fs.alterar_senha_com_token('token', 'Senha123!')
    assert 'error' in res and 'boom' in res['error']['message']


def test_timed_cache_decorator(monkeypatch):
    counter = {'n': 0}

    @fs._timed_cache(ttl=1)
    def get_count(x):
        counter['n'] += 1
        return counter['n']

    a = get_count(1)
    b = get_count(1)
    assert a == b  # cached
    time.sleep(1.1)
    c = get_count(1)
    assert c != a


def test_obter_clinica_handles_exception(monkeypatch):
    # Simulate db.collection(...).document(...).get() raising
    class BadDoc:
        def get(self):
            raise Exception('dbfail')

    class BadColl:
        def document(self, _):
            return BadDoc()

    fake_db = types.SimpleNamespace(collection=lambda name: BadColl())
    monkeypatch.setattr(fs, 'db', fake_db)

    out = fs.obter_clinica('c1')
    assert out is None


def test_atualizar_profissional_fallback_to_set(monkeypatch):
    # doc_ref.update raises, but set with merge works
    class BadRef:
        def update(self, payload):
            raise Exception('update fail')

    class SetRef:
        def __init__(self):
            self.set_called = False

        def set(self, payload, merge=False):
            self.set_called = True
            return True

    class Coll:
        def __init__(self):
            self._setref = SetRef()

        def document(self, uid):
            # first call for update path returns BadRef, but later we need access to collection().document().set
            return BadRef()

    # We simulate db.collection('profissionais').document(uid).update raising, and fallback to calling set via a different path
    # Monkeypatch db to have collection that returns an object whose document() returns BadRef for update and whose document() for set will be invoked differently
    # Simpler: monkeypatch db.collection to return object with document() method that returns an object whose update raises, and also set on the collection path is available
    class FakeDB:
        def collection(self, name):
            return types.SimpleNamespace(document=lambda uid: BadRef(), **{'document_set_ref': SetRef()})

    fake_db = FakeDB()
    # monkeypatch the db.collection(...).document(...).set called in fallback by replacing that call path directly
    def fake_collection(name):
        class C:
            def document(self, uid):
                return BadRef()

            def __repr__(self):
                return '<C>'

        return C()

    # For fallback, patch db.collection(...).document(...).set by monkeypatching the chain used in code
    # We'll monkeypatch fs.db to a SimpleNamespace that returns a proxy object where .document(uid).set exists
    class ProxyDoc:
        def update(self, payload):
            raise Exception('update fail')

        def set(self, payload, merge=False):
            return True

    class ProxyColl:
        def document(self, uid):
            return ProxyDoc()

    monkeypatch.setattr(fs, 'db', types.SimpleNamespace(collection=lambda name: ProxyColl()))

    res = fs.atualizar_profissional('m1', {'a': 1})
    assert res is True
