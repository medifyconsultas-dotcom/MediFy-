import datetime
import pytest

import medify_web.firebase_services as fs


class RefUpdateFail:
    def __init__(self):
        self.updated = {}

    def update(self, payload):
        raise Exception('update failed')

    def set(self, payload, merge=False):
        self.updated.update(payload)
        return True


class RefOK:
    def __init__(self):
        self.updated = {}

    def update(self, payload):
        self.updated.update(payload)

    def set(self, payload, merge=False):
        self.updated.update(payload)
        return True


class DocForGet:
    def __init__(self, id_, data):
        self.id = id_
        self._data = data
        self.reference = RefOK()
        self.exists = True

    def to_dict(self):
        return dict(self._data)

    def get(self):
        return self


class DocStream:
    def __init__(self, id_, data, ref):
        self.id = id_
        self._data = data
        self.reference = ref

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
                # return a DocumentReference-like object with get/update/set
                class DocumentRef:
                    def __init__(self, doc):
                        self._doc = doc

                    def get(self):
                        return self._doc

                    def update(self, payload):
                        # delegate to the underlying snapshot's reference
                        return self._doc.reference.update(payload)

                    def set(self, payload, merge=False):
                        return self._doc.reference.set(payload, merge=merge)

                return DocumentRef(d)
        # return non-existing doc
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


def test_marcar_consulta_cancelada_updates_top_and_subcollections(monkeypatch):
    # prepare a consulta dict returned by obter_consulta
    consulta = {'id': 'c1', 'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '09:00'}
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: consulta)

    # top-level doc exists but update fails; set should succeed
    top_doc = DocForGet('c1', {'status': 'Agendada'})
    top_doc.reference = RefUpdateFail()

    # paciente subcollection doc
    p_ref = RefOK()
    pdoc = DocStream('c1', {'paciente_uid': 'p1', 'data': '2020-01-01', 'hora': '09:00'}, p_ref)

    # profissional subcollection doc
    pr_ref = RefOK()
    prdoc = DocStream('c1', {'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '09:00'}, pr_ref)

    fake_db = FakeDB({
        'consultas': FakeCollection([top_doc]),
        'consultas_clinicas': FakeCollection([]),
        'consultas_autonomos': FakeCollection([]),
        'pacientes': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([pdoc])})()})(),
        'profissionais': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([prdoc])})()})(),
    })

    monkeypatch.setattr(fs, 'db', fake_db)

    res = fs.marcar_consulta_cancelada('c1', motivo='test-mot', liberar_horario=False)
    assert res is True


def test_finalizar_consultas_passadas_marks_and_updates_subcollections(monkeypatch):
    # make now in the future relative to docs
    past1 = '2020-01-01 09:00'
    past2 = datetime.datetime(2020, 2, 2).isoformat()

    # doc1: will be parsed by strptime
    doc1 = DocStream('a1', {'status': 'Agendada', 'data_consulta': past1, 'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '09:00'}, RefOK())
    # doc2: will be parsed by fromisoformat
    doc2 = DocStream('a2', {'status': 'Agendada', 'data_consulta': past2, 'paciente_uid': 'p2', 'profissional_uid': 'pr2', 'data': '2020-02-02', 'hora': '10:00'}, RefUpdateFail())

    # patients/professional subcollections with matching entries
    p1_doc = DocStream('a1', {'paciente_uid': 'p1', 'data': '2020-01-01', 'hora': '09:00'}, RefOK())
    pr2_doc = DocStream('a2', {'profissional_uid': 'pr2', 'data': '2020-02-02', 'hora': '10:00'}, RefOK())

    fake_db = FakeDB({
        'consultas': FakeCollection([doc1]),
        'consultas_clinicas': FakeCollection([doc2]),
        'consultas_autonomos': FakeCollection([]),
        'pacientes': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([p1_doc])})()})(),
        'profissionais': type('P', (), {'document': lambda self, uid: type('C', (), {'collection': lambda self2, name: FakeCollection([pr2_doc])})()})(),
    })

    monkeypatch.setattr(fs, 'db', fake_db)

    changed = fs.finalizar_consultas_passadas()
    assert isinstance(changed, int)
    assert changed >= 1
