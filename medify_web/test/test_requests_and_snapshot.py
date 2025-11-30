import types
import medify_web.firebase_services as fs
import datetime


def test_enviar_email_redefinicao_success(monkeypatch):
    # fake response object with json()
    class Resp:
        def __init__(self, payload):
            self._p = payload
        def json(self):
            return self._p

    def fake_post(url, json=None):
        assert 'sendOobCode' in url
        return Resp({'ok': True, 'email': json.get('email')})

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=fake_post))
    out = fs.enviar_email_redefinicao('u@test')
    assert out.get('ok') is True and out.get('email') == 'u@test'


def test_alterar_senha_com_token_success_and_failure(monkeypatch):
    class Resp:
        def __init__(self, payload):
            self._p = payload
        def json(self):
            return self._p

    def fake_post_success(url, json=None):
        return Resp({'passwordUpdated': True})

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=fake_post_success))
    ok = fs.alterar_senha_com_token('token', 'nova')
    assert ok.get('passwordUpdated') is True

    def fake_post_raises(url, json=None):
        raise RuntimeError('net error')

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=fake_post_raises))
    err = fs.alterar_senha_com_token('token', 'nova')
    assert isinstance(err, dict) and 'error' in err


def test_safe_snapshot_dict_variants():
    # None -> None
    assert fs._safe_snapshot_dict(None) is None

    # object without to_dict or id -> None
    class X: pass
    assert fs._safe_snapshot_dict(X()) is None

    # snapshot with to_dict missing id -> id added
    class Snap1:
        def __init__(self, id_):
            self.id = id_
        def to_dict(self):
            return {'a': 1}

    s1 = Snap1('doc1')
    out1 = fs._safe_snapshot_dict(s1)
    assert out1.get('id') == 'doc1' and out1.get('a') == 1

    # snapshot with to_dict containing id should keep that id
    class Snap2:
        def __init__(self, id_):
            self.id = id_
        def to_dict(self):
            return {'id': 'inner', 'b': 2}

    s2 = Snap2('doc2')
    out2 = fs._safe_snapshot_dict(s2)
    assert out2.get('id') == 'inner' and out2.get('b') == 2


def test_listar_medicos_clinicas_filters_and_normalization(monkeypatch):
    # doc that is not medico should be filtered out
    class Doc1:
        def __init__(self, id_, cargo):
            self.id = id_
            self._d = {'cargo': cargo}
        def to_dict(self):
            return dict(self._d)

    d1 = Doc1('x1', 'Recepcionista')
    d2 = Doc1('x2', 'MEDICO')

    fake_db = types.SimpleNamespace(collection=lambda n: types.SimpleNamespace(stream=lambda: [d1, d2]))
    monkeypatch.setattr(fs, 'db', fake_db)

    res = fs.listar_medicos_clinicas.__wrapped__()
    # only one medico expected
    assert isinstance(res, list) and len(res) == 1
    m = res[0]
    assert m.get('uid') == m.get('id') or m.get('uid') == m.get('id')
    assert m.get('especialidade') is not None
