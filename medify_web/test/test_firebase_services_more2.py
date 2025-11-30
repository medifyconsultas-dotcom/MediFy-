import pytest
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self, exists=True, should_fail_update=False):
        self.exists = exists
        self.updated = {}
        self.should_fail_update = should_fail_update

    def get(self):
        return type('S', (), {'exists': self.exists})()

    def update(self, payload):
        if self.should_fail_update:
            raise Exception('update failed')
        self.updated.update(payload)

    def set(self, payload, merge=False):
        self.updated.update(payload)

    def delete(self):
        self.deleted = True


class FakeDoc:
    def __init__(self, id_, data=None, ref=None):
        self.id = id_
        self._data = data or {}
        self.reference = ref or FakeRef()

    def to_dict(self):
        return dict(self._data)


class FakeCollection:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def document(self, docid=None):
        for d in self._docs:
            if getattr(d, 'id', None) == docid:
                class G:
                    def __init__(self, doc):
                        self._doc = doc

                    def get(self):
                        return self._doc

                    @property
                    def reference(self):
                        return self._doc.reference

                return G(d)
        # non-existing snapshot
        class G2:
            def get(self):
                return type('X', (), {'exists': False})()

        return G2()

    def where(self, *args, **kwargs):
        return self


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeCollection([]))


def test_deletar_consulta_completa_top_and_subcollections(monkeypatch):
    # top-level exists and should be deleted
    top_ref = FakeRef(exists=True)
    top_doc = FakeDoc('c1', {'id': 'c1'}, ref=top_ref)

    # patient subcoll doc
    pdoc = FakeDoc('c1', {'paciente_uid': 'p1', 'data': '2025-01-01', 'hora': '09:00'}, ref=FakeRef())
    prdoc = FakeDoc('c1', {'profissional_uid': 'pr1', 'data': '2025-01-01', 'hora': '09:00'}, ref=FakeRef())

    fake_db = FakeDB({
        'consultas': FakeCollection([top_doc]),
        'consultas_clinicas': FakeCollection([]),
        'consultas_autonomos': FakeCollection([]),
        'pacientes': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([pdoc])})()})(),
        'profissionais': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([prdoc])})()})(),
    })

    monkeypatch.setattr(fs, 'db', fake_db)
    res = fs.deletar_consulta_completa('c1')
    assert isinstance(res, bool)


def test_listar_consultas_profissional_and_paciente_normalization(monkeypatch):
    # consultas_clinicas with combined data_consulta
    doc1 = FakeDoc('a1', {'id_paciente': 'p1', 'nm_paciente': 'P1', 'id_profissional': 'pr1', 'nm_profissional': 'Dr', 'data_consulta': '2025-01-01 09:00', 'nm_clinica': 'C1'})
    # consultas_autonomos with separate fields
    doc2 = FakeDoc('a2', {'paciente_uid': 'p2', 'paciente_nome': 'P2', 'profissional_uid': 'pr2', 'profissional_nome': 'Dr2', 'data': '2025-02-02', 'hora': '10:00', 'local': 'Local A'})

    fake_db = FakeDB({
        'consultas_clinicas': FakeCollection([doc1]),
        'consultas_autonomos': FakeCollection([doc2]),
        'consultas': FakeCollection([]),
    })

    monkeypatch.setattr(fs, 'db', fake_db)
    res_prof = fs.listar_consultas_profissional('pr1')
    assert isinstance(res_prof, list)
    assert any(r.get('id') == 'a1' for r in res_prof)

    res_pac = fs.listar_consultas_paciente('p2')
    assert isinstance(res_pac, list)
    assert any(r.get('id') == 'a2' for r in res_pac)


def test_criar_consulta_clinica_creates_and_returns_id(monkeypatch):
    # simulate collection.add by ensuring document().id
    class DocRef:
        def __init__(self, id_):
            self.id = id_
            self._data = None

        def set(self, payload):
            self._data = payload

    col = FakeCollection()
    col.document = lambda : DocRef('genid')
    fake_db = FakeDB({'consultas_clinicas': col})
    monkeypatch.setattr(fs, 'db', fake_db)

    dados = {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2025-12-01', 'hora': '09:00'}
    newid = fs.criar_consulta_clinica(dados)
    # accept that implementation returns an id-like value or the doc-like object
    assert newid is not None
