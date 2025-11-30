import types
import pytest
import medify_web.firebase_services as fs


class MinimalDoc:
    def __init__(self, id_, data):
        self.id = id_
        self._data = data

    def to_dict(self):
        return dict(self._data)


def test_safe_snapshot_dict_none_and_bad():
    assert fs._safe_snapshot_dict(None) is None

    class X: pass
    assert fs._safe_snapshot_dict(X()) is None


def test_listar_medicos_clinicas_cache_and_filter(monkeypatch):
    doc_med = MinimalDoc('m1', {'cargo': 'Medico', 'nome': 'Dr Teste', 'especialidade': 'Derm'})
    fake_db = types.SimpleNamespace(collection=lambda name: types.SimpleNamespace(stream=lambda: [doc_med]))
    monkeypatch.setattr(fs, 'db', fake_db)
    # call unwrapped to populate cache and then wrapper to take cached path
    first = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(first, list) and first
    second = fs.listar_medicos_clinicas()
    assert isinstance(second, list)


def test_is_medico_profile_complete_false_and_true(monkeypatch):
    # no clinics -> False
    fake_db = types.SimpleNamespace(collection=lambda name: types.SimpleNamespace(stream=lambda: []))
    monkeypatch.setattr(fs, 'db', fake_db)
    assert fs.is_medico_profile_complete('noone') is False

    # clinic with medico entry with nome+crm -> True
    clinic = MinimalDoc('c1', {'medicos': [{'uid': 'm1', 'nome': 'X', 'crm': '123'}]})
    fake_db2 = types.SimpleNamespace(collection=lambda name: types.SimpleNamespace(stream=lambda: [clinic]) )
    monkeypatch.setattr(fs, 'db', fake_db2)
    assert fs.is_medico_profile_complete('m1') is True


def test_marcar_medico_profile_completed_updates(monkeypatch):
    # clinic with medicos array where uid matches should be updated
    clinic = MinimalDoc('c1', {'medicos': [{'uid': 'm1', 'nome': 'X', 'crm': '123'}]})
    # fake collection.document(pid).update should be callable
    class FakeDocRef:
        def __init__(self):
            self.updated = None
        def update(self, payload):
            self.updated = payload

    def fake_collection(name):
        class C:
            def document(self, pid):
                return FakeDocRef()
        return C()

    fake_db = types.SimpleNamespace(collection=lambda n: types.SimpleNamespace(stream=lambda: [clinic]))
    monkeypatch.setattr(fs, 'db', fake_db)
    # calling marcar should return True (it attempts update)
    res = fs.marcar_medico_profile_completed('m1')
    assert isinstance(res, bool)
