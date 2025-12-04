import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self, id_=None, fail_update=False):
        self.id = id_
        self.fail_update = fail_update
        self.updated = False
        self.set_called = False

    def update(self, payload):
        if self.fail_update:
            raise Exception('forced update')
        self.updated = True
        return True

    def set(self, payload, merge=False):
        self.set_called = True
        return True

    def delete(self):
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


class FakeColl:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def where(self, field, op, value):
        # simple filter implementation
        filtered = []
        for d in self._docs:
            try:
                v = d.to_dict().get(field)
            except Exception:
                v = getattr(d, field, None)
            if op == '==' and v == value:
                filtered.append(d)
        return FakeColl(filtered)

    def limit(self, n):
        return self

    def document(self, pid=None):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return FakeDocumentRef(d)
            try:
                td = d.to_dict()
            except Exception:
                td = None
            if td and td.get('id') == pid:
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


def test_listar_consultas_completas_enrichment_handles_none(monkeypatch):
    # consultas with data_consulta in both formats
    c1 = FakeDoc('c1', {'id_paciente': 'pZ', 'id_profissional': 'prZ', 'data_consulta': '2021-05-01 08:00'})
    c2 = FakeDoc('c2', {'id_paciente': 'pZ', 'id_profissional': 'prZ', 'data_consulta': '2021-05-02T09:00:00'})

    fake = FakeDB({'consultas': FakeColl([]), 'consultas_clinicas': FakeColl([c1]), 'consultas_autonomos': FakeColl([c2]), 'pacientes': FakeColl([])})
    monkeypatch.setattr(fs, 'db', fake)

    # make obter_profissional/paciente return None to exercise graceful handling
    monkeypatch.setattr(fs, 'obter_profissional', lambda uid: None)
    monkeypatch.setattr(fs, 'obter_paciente', lambda uid: None)

    out = fs.listar_consultas_completas_paciente(paciente_uid='pZ')
    assert isinstance(out, list)
    assert any(o.get('id') in ('c1', 'c2') or o.get('origem') for o in out)


def test_listar_consultas_por_email_patient_doc_no_id_but_to_dict_has_id(monkeypatch):
    # top-level empty; patient doc has id=None but to_dict returns dict with id
    ps = FakeDoc(None, {'id': 'pA', 'email': 'mail@a.com'}, subcollections={'consultas': FakeColl([FakeDoc('pc1', {'data': '2022-01-01', 'hora': '07:00'})])})
    fake = FakeDB({'consultas': FakeColl([]), 'pacientes': FakeColl([ps])})
    monkeypatch.setattr(fs, 'db', fake)

    res = fs.listar_consultas_por_email('mail@a.com')
    assert isinstance(res, list)
    assert len(res) == 1


def test_listar_consultas_completas_by_uid_mixed_sources(monkeypatch):
    # have docs in consultas, consultas_clinicas, consultas_autonomos and patient subcollection
    top = FakeDoc('t1', {'paciente_uid': 'pu', 'profissional_uid': 'pru', 'data': '2022-02-02', 'hora': '08:00'})
    clinic = FakeDoc('cl1', {'id_paciente': 'pu', 'id_profissional': 'pru', 'data_consulta': '2022-02-03 09:00'})
    auton = FakeDoc('au1', {'id_paciente': 'pu', 'id_profissional': 'pru', 'data': '2022-02-04', 'hora': '10:00'})
    psub = FakeDoc('psx', {'data': '2022-02-04', 'hora': '10:00', 'profissional_uid': 'pru'})
    paciente = FakeDoc('pu', {'nome': 'P'}, subcollections={'consultas': FakeColl([psub])})

    fake = FakeDB({'consultas': FakeColl([top]), 'consultas_clinicas': FakeColl([clinic]), 'consultas_autonomos': FakeColl([auton]), 'pacientes': FakeColl([paciente])})
    monkeypatch.setattr(fs, 'db', fake)

    # mock obter_profissional/paciente to return small dicts
    monkeypatch.setattr(fs, 'obter_profissional', lambda uid: {'nome': 'Dr Z'})
    monkeypatch.setattr(fs, 'obter_paciente', lambda uid: {'nome': 'Pt Z'})

    res = fs.listar_consultas_completas_paciente(paciente_uid='pu')
    assert isinstance(res, list)
    # should include entries from all sources
    ids = {c.get('id') for c in res if c.get('id')}
    assert {'t1', 'cl1', 'au1'} & ids
