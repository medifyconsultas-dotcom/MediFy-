import types
import medify_web.firebase_services as fs


class DocNoDict:
    # object without to_dict or id
    pass


class FakeDoc:
    def __init__(self, id_, data, ref=None):
        self.id = id_
        self._data = data
        self.reference = ref

    def to_dict(self):
        return dict(self._data)


class FakeRef:
    def __init__(self, raise_on_delete=False):
        self.raise_on_delete = raise_on_delete
        self.deleted = False

    def delete(self):
        if self.raise_on_delete:
            raise Exception("delete failed")
        self.deleted = True
        return True


class FakeColl:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def document(self, pid):
        # return a simple object with delete() that may raise
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return d.reference
        # default behavior: object whose delete raises
        return types.SimpleNamespace(delete=lambda: (_ for _ in ()).throw(Exception('not found')))


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_safe_snapshot_dict_handles_none_and_non_snapshot():
    # None -> None
    assert fs._safe_snapshot_dict(None) is None

    # object missing to_dict/id -> None
    assert fs._safe_snapshot_dict(DocNoDict()) is None


def test_safe_snapshot_preserves_inner_id(monkeypatch):
    # Create fake doc where to_dict returns an inner id
    inner = {'id': 'inner-id', 'name': 'X'}

    class D:
        id = 'outer'

        def to_dict(self):
            return dict(inner)

    out = fs._safe_snapshot_dict(D())
    assert out is not None
    # function should keep the inner id value, not overwrite with outer
    assert out.get('id') == 'inner-id'


def test_deletar_horario_profissional_failure(monkeypatch):
    # Simulate db where document.delete raises -> function should return False
    bad_ref = FakeRef(raise_on_delete=True)
    fake = FakeDB({'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([FakeDoc('h1', {'a': 1}, ref=bad_ref)])))})
    monkeypatch.setattr(fs, 'db', fake)
    res = fs.deletar_horario_profissional('p1', 'h1')
    assert res is False


def test_deletar_horario_profissional_success(monkeypatch):
    # Simulate successful delete
    good_ref = FakeRef(raise_on_delete=False)
    fake = FakeDB({'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([FakeDoc('h1', {'a': 1}, ref=good_ref)])))})
    monkeypatch.setattr(fs, 'db', fake)
    res = fs.deletar_horario_profissional('p1', 'h1')
    assert res is True
    assert good_ref.deleted is True
