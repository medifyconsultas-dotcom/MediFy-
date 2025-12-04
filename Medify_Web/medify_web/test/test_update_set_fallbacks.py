import types
import medify_web.firebase_services as fs


class FakeDocRef:
    def __init__(self):
        self.set_called = False
        self.set_args = None

    def update(self, payload):
        raise Exception("simulated update failure")

    def set(self, payload, merge=False):
        self.set_called = True
        self.set_args = (payload, merge)
        return True


class FakeCollection:
    def __init__(self):
        self._docs = {}

    def document(self, pid):
        # return same FakeDocRef instance per pid to observe set calls
        if pid not in self._docs:
            self._docs[pid] = FakeDocRef()
        return self._docs[pid]


def make_fake_db_for(name):
    coll = FakeCollection()
    return types.SimpleNamespace(collection=lambda n: coll if n == name else coll)


def test_atualizar_profissional_fallback(monkeypatch):
    fake = make_fake_db_for('profissionais')
    monkeypatch.setattr(fs, 'db', fake)

    uid = 'prof1'
    updates = {'nome': 'Novo'}
    res = fs.atualizar_profissional(uid, updates)
    assert res is True
    doc = fake.collection('profissionais').document(uid)
    assert doc.set_called is True
    assert doc.set_args == (updates, True)


def test_atualizar_clinica_fallback(monkeypatch):
    fake = make_fake_db_for('clinicas')
    monkeypatch.setattr(fs, 'db', fake)

    cid = 'c1'
    updates = {'endereco': 'Rua X'}
    res = fs.atualizar_clinica(cid, updates)
    assert res is True
    doc = fake.collection('clinicas').document(cid)
    assert doc.set_called is True
    assert doc.set_args == (updates, True)
