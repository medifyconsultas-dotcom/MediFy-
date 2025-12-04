import types
import medify_web.firebase_services as fs


# Minimal fakes reused across tests
class FakeRef:
    def __init__(self, id_=None, fail_update=False):
        self.id = id_
        self.fail_update = fail_update
        self.updated = False
        self.set_called = False
        self.deleted = False

    def update(self, payload):
        if self.fail_update:
            raise Exception('forced update')
        self.updated = True
        return True

    def set(self, payload, merge=False):
        self.set_called = True
        return True

    def delete(self):
        self.deleted = True
        return True

    def get(self):
        return types.SimpleNamespace(exists=True, to_dict=lambda: {})


class FakeDoc:
    def __init__(self, id_, data, ref=None, subcollections=None):
        self.id = id_
        self._data = data
        self.reference = ref or FakeRef(id_)
        self.subcollections = subcollections or {}

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class Query:
    def __init__(self, docs):
        self._docs = list(docs)
        self._filters = []

    def where(self, field, op, value):
        self._filters.append((field, op, value))
        return self

    def limit(self, n):
        return self

    def stream(self):
        for d in self._docs:
            ok = True
            for (f, op, v) in self._filters:
                val = None
                try:
                    val = d.to_dict().get(f)
                except Exception:
                    val = getattr(d, f, None)
                if op == '==' and val != v:
                    ok = False
                    break
            if ok:
                yield d


class FakeColl:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def where(self, field, op, value):
        return Query(self._docs).where(field, op, value)

    def limit(self, n):
        return self

    def document(self, pid=None):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return FakeDocumentRef(d)
        return FakeDocumentRef(None)

    def add(self, dados):
        return (FakeRef('newid'), 'newid')


class FakeDocumentRef:
    def __init__(self, doc=None):
        self.doc = doc

    @property
    def id(self):
        return getattr(self.doc, 'id', None)

    def set(self, payload, merge=False):
        if self.doc:
            self.doc._data = dict(payload)
            if hasattr(self.doc, 'reference'):
                self.doc.reference.set(payload, merge=merge)
        return True

    def update(self, payload):
        if self.doc and hasattr(self.doc, 'reference'):
            return self.doc.reference.update(payload)
        raise Exception('no doc')

    def delete(self):
        if self.doc and hasattr(self.doc, 'reference'):
            return self.doc.reference.delete()
        return True

    def get(self):
        if self.doc:
            return types.SimpleNamespace(exists=True, to_dict=lambda: dict(self.doc._data))
        return types.SimpleNamespace(exists=False, to_dict=lambda: None)

    def collection(self, name):
        if self.doc and hasattr(self.doc, 'subcollections'):
            return self.doc.subcollections.get(name, FakeColl([]))
        return FakeColl([])


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_listar_consultas_profissional_and_paciente(monkeypatch):
    c1 = FakeDoc('c1', {'id_profissional': 'pr1', 'id_paciente': 'p1', 'data_consulta': '2021-01-01 09:00'})
    c2 = FakeDoc('c2', {'id_profissional': 'pr1', 'id_paciente': 'p2', 'data_consulta': '2021-01-02 10:00'})
    ca = FakeDoc('ca1', {'id_paciente': 'p1', 'data': '2021-01-03', 'hora': '11:00'})

    fake = FakeDB({
        'consultas_clinicas': FakeColl([c1, c2]),
        'consultas_autonomos': FakeColl([ca])
    })
    monkeypatch.setattr(fs, 'db', fake)

    res_prof = fs.listar_consultas_profissional('pr1')
    assert isinstance(res_prof, list)
    assert any(r.get('profissional_uid') == 'pr1' or r.get('id_profissional') == 'pr1' for r in res_prof)

    res_pat = fs.listar_consultas_paciente('p1')
    assert isinstance(res_pat, list)
    assert any(r.get('paciente_uid') == 'p1' or r.get('id_paciente') == 'p1' for r in res_pat)


def test_listar_consultas_por_email_and_nome(monkeypatch):
    top = FakeDoc('t1', {'paciente_email': 'e@x.com', 'paciente_nome': 'Full Name'})
    fake = FakeDB({'consultas': FakeColl([top])})
    monkeypatch.setattr(fs, 'db', fake)

    res_email = fs.listar_consultas_por_email('e@x.com')
    assert isinstance(res_email, list) and len(res_email) == 1

    res_nome = fs.listar_consultas_por_nome('Full Name')
    assert isinstance(res_nome, list) and len(res_nome) == 1


def test_listar_consultas_completas_paciente_email_and_name_paths(monkeypatch):
    # no top-level by uid, but by email
    top = FakeDoc('t1', {'paciente_email': 'mail@x.com', 'id_profissional': 'prA', 'data': '2022-02-02', 'hora': '08:00'})
    paciente = FakeDoc('pX', {'email': 'mail@x.com'}, subcollections={'consultas': FakeColl([FakeDoc('ps1', {'data': '2022-02-02', 'hora': '08:00', 'profissional_uid': 'prA'})])})

    fake = FakeDB({'consultas': FakeColl([top]), 'pacientes': FakeColl([paciente]), 'consultas_clinicas': FakeColl([]), 'consultas_autonomos': FakeColl([])})
    monkeypatch.setattr(fs, 'db', fake)

    res = fs.listar_consultas_completas_paciente(paciente_email='mail@x.com')
    assert isinstance(res, list)
    assert any('profissional_uid' in c or 'data' in c for c in res)

    # by name fallback
    top2 = FakeDoc('t2', {'paciente_nome': 'Nome Exato', 'id_profissional': 'prB', 'data': '2022-03-03', 'hora': '09:00'})
    fake2 = FakeDB({'consultas': FakeColl([top2]), 'consultas_clinicas': FakeColl([]), 'consultas_autonomos': FakeColl([])})
    monkeypatch.setattr(fs, 'db', fake2)
    res2 = fs.listar_consultas_completas_paciente(paciente_nome='Nome Exato')
    assert isinstance(res2, list) and len(res2) >= 1


def test_listar_consultas_por_email_fallback_to_patient_subcollection(monkeypatch):
    # consultas top-level empty; should find via patient subcollection
    paciente = FakeDoc('pE', {'email': 'sub@x.com'}, subcollections={'consultas': FakeColl([FakeDoc('ps2', {'data': '2022-04-04', 'hora': '10:00'})])})
    fake = FakeDB({'consultas': FakeColl([]), 'pacientes': FakeColl([paciente])})
    monkeypatch.setattr(fs, 'db', fake)

    res = fs.listar_consultas_por_email('sub@x.com')
    assert isinstance(res, list)
    assert len(res) == 1
