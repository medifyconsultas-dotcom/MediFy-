import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self):
        self.deleted = False

    def delete(self):
        self.deleted = True
        return True


class FakeDoc:
    def __init__(self, id_, data):
        self.id = id_
        self._data = data
        self.reference = FakeRef()

    def to_dict(self):
        return dict(self._data)


class FakeColl:
    def __init__(self, docs=None):
        self._docs = docs or []

    def where(self, *args, **kwargs):
        return self

    def stream(self):
        return list(self._docs)


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_remover_consultas_por_paciente_and_filters(monkeypatch):
    # two docs in paciente subcollection, one matches profissional_uid filter
    d1 = FakeDoc('d1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '10:00'})
    d2 = FakeDoc('d2', {'paciente_uid': 'p1', 'profissional_uid': 'pr2', 'data': '2020-01-01', 'hora': '10:00'})
    pac_coll = FakeColl([d1, d2])

    fake = FakeDB({
        'pacientes': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: pac_coll)),
        'profissionais': FakeColl([])
    })
    monkeypatch.setattr(fs, 'db', fake)

    # remove only those where profissional_uid == 'pr1'
    removed = fs.remover_consultas_por_chave(paciente_uid='p1', profissional_uid='pr1', data_str='2020-01-01', hora_str='10:00')
    assert removed == 1
    assert d1.reference.deleted is True
    assert d2.reference.deleted is False


def test_remover_consultas_by_profissional_only(monkeypatch):
    d1 = FakeDoc('d1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-02', 'hora': '09:00'})
    d2 = FakeDoc('d2', {'paciente_uid': 'p2', 'profissional_uid': 'pr1', 'data': '2020-01-02', 'hora': '09:00'})
    prof_coll = FakeColl([d1, d2])
    fake = FakeDB({
        'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: prof_coll)),
        'pacientes': FakeColl([])
    })
    import medify_web.firebase_services as fs2
    import pytest
    from types import SimpleNamespace
    # monkeypatch via pytest fixture not directly available here, so use attribute set
    fs.db = fake

    removed = fs.remover_consultas_por_chave(profissional_uid='pr1', data_str='2020-01-02', hora_str='09:00')
    assert removed == 2
    assert d1.reference.deleted and d2.reference.deleted


def test_timed_cache_hit_and_miss(monkeypatch):
    # Ensure deterministic test by clearing the wrapper cache if present
    wrapper = fs.listar_medicos_clinicas
    try:
        if wrapper.__closure__:
            for cell in wrapper.__closure__:
                try:
                    if isinstance(cell.cell_contents, dict):
                        cell.cell_contents.clear()
                except Exception:
                    continue
    except Exception:
        pass

    # initial db returns one medico
    md1 = FakeDoc('m1', {'cargo': 'Medico', 'nome': 'A', 'especialidade': 'X'})
    fake1 = FakeDB({'funcionarios': FakeColl([md1])})
    monkeypatch.setattr(fs, 'db', fake1)

    # call wrapper to populate cache
    first = fs.listar_medicos_clinicas()
    assert isinstance(first, list) and len(first) == 1

    # change db to new data, wrapper should still return cached (hit)
    md2 = FakeDoc('m2', {'cargo': 'Medico', 'nome': 'B', 'especialidade': 'Y'})
    fake2 = FakeDB({'funcionarios': FakeColl([md2])})
    monkeypatch.setattr(fs, 'db', fake2)

    second = fs.listar_medicos_clinicas()
    assert second == first

    # bypass cache to get fresh
    fresh = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(fresh, list) and fresh != first
