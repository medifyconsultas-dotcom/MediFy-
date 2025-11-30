import types
import medify_web.firebase_services as fs


class SimpleSnapshot:
    def __init__(self, id_, data):
        self.id = id_
        self._data = data

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class FakeColl:
    def __init__(self, docs):
        self._docs = docs

    def stream(self):
        return list(self._docs)


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_enviar_email_redefinicao_success(monkeypatch):
    called = {}

    def fake_post(url, json=None):
        called['url'] = url
        called['json'] = json
        return types.SimpleNamespace(json=lambda: {'ok': True, 'email': json.get('email')})

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=fake_post))
    out = fs.enviar_email_redefinicao('a@b.com', api_key='APIKEY')
    assert out['ok'] is True
    assert out['email'] == 'a@b.com'
    assert 'APIKEY' in called['url']


def test_alterar_senha_com_token_success_and_error(monkeypatch):
    def ok_post(url, json=None):
        return types.SimpleNamespace(json=lambda: {'email': 'user@x'})

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=ok_post))
    ok = fs.alterar_senha_com_token('tok', 'newpass', api_key='K')
    assert ok.get('email') == 'user@x'

    def err_post(url, json=None):
        raise Exception('network')

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=err_post))
    err = fs.alterar_senha_com_token('tok', 'newpass', api_key='K')
    assert 'error' in err and 'network' in err['error']['message']


def test_safe_snapshot_and_listar_medicos_edgecases(monkeypatch):
    # invalid inputs
    assert fs._safe_snapshot_dict(None) is None
    class NoSnapshot: pass
    assert fs._safe_snapshot_dict(NoSnapshot()) is None

    s = SimpleSnapshot('id1', {'nome': 'X'})
    sd = fs._safe_snapshot_dict(s)
    assert sd['id'] == 'id1'

    # listar_medicos_clinicas: include different cargo casings and missing fields
    doc_med_upper = SimpleSnapshot('m1', {'cargo': 'Medico', 'nome': 'Dr U', 'especialidade': 'Cardio'})
    doc_med_lower = SimpleSnapshot('m2', {'cargo': 'medico', 'nome': 'Dr L'})
    doc_other = SimpleSnapshot('o1', {'cargo': 'Recepcao', 'nome': 'Ana'})
    doc_bad = SimpleSnapshot('b1', None)

    fake = FakeDB({'funcionarios': FakeColl([doc_med_upper, doc_med_lower, doc_other, doc_bad])})
    monkeypatch.setattr(fs, 'db', fake)
    res = fs.listar_medicos_clinicas.__wrapped__()
    # should include only medico entries
    uids = {r.get('id') or r.get('uid') for r in res}
    assert 'm1' in uids and 'm2' in uids
    assert all(r.get('especialidade') for r in res)
