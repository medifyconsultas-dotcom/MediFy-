import datetime
import types
import medify_web.firebase_services as fs


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
        # find doc by id
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return FakeDocumentRef(d)
        # return ref for new doc
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


def test_listar_consultas_completas_paciente_and_enrich(monkeypatch):
    # create docs in multiple places
    top = FakeDoc('t1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '09:00'})
    clinic = FakeDoc('cc1', {'id_paciente': 'p1', 'id_profissional': 'pr1', 'data_consulta': '2020-01-02 10:00'})
    auto = FakeDoc('ca1', {'id_paciente': 'p1', 'id_profissional': 'pr1', 'data': '2020-01-03', 'hora': '11:00'})

    # patient subcollection
    psubdoc = FakeDoc('ps1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-03', 'hora': '11:00'})
    paciente_doc = FakeDoc('p1', {'nome': 'Paciente'}, subcollections={'consultas': FakeColl([psubdoc])})

    fake = FakeDB({
        'consultas': FakeColl([top]),
        'consultas_clinicas': FakeColl([clinic]),
        'consultas_autonomos': FakeColl([auto]),
        'pacientes': FakeColl([paciente_doc])
    })

    monkeypatch.setattr(fs, 'db', fake)

    # monkeypatch obter_profissional/paciente to return names
    monkeypatch.setattr(fs, 'obter_profissional', lambda uid: {'nome': 'Dr X'})
    monkeypatch.setattr(fs, 'obter_paciente', lambda uid: {'nome': 'Pt Y'})

    res = fs.listar_consultas_completas_paciente(paciente_uid='p1')
    assert isinstance(res, list)
    # dedupe should avoid duplicates; expect at least 3 entries (top/clinic/auto)
    assert any(c.get('profissional_nome') == 'Dr X' or c.get('paciente_nome') == 'Pt Y' for c in res)


def test_finalizar_consultas_passadas_update_set_fallback(monkeypatch):
    now = datetime.datetime.now()
    past1 = (now - datetime.timedelta(days=10)).strftime('%Y-%m-%d %H:%M')
    past2 = (now - datetime.timedelta(days=5)).isoformat()

    # docs that should be finalized
    r1 = FakeRef('r1', fail_update=True)
    doc1 = FakeDoc('d1', {'data_consulta': past1, 'status': 'Agendada'}, ref=r1)

    r2 = FakeRef('r2', fail_update=True)
    doc2 = FakeDoc('d2', {'data_consulta': past2, 'status': 'Agendada'}, ref=r2)

    fake = FakeDB({
        'consultas': FakeColl([doc1]),
        'consultas_clinicas': FakeColl([doc2]),
        'consultas_autonomos': FakeColl([]),
    })
    monkeypatch.setattr(fs, 'db', fake)

    changed = fs.finalizar_consultas_passadas()
    assert changed >= 2
    assert r1.set_called is True and r2.set_called is True


def test_prontuario_crud(monkeypatch):
    # prontuario in paciente subcollection
    pr = FakeDoc('pr1', {'campo': 'v1'})
    paciente = FakeDoc('p1', {'nome': 'P'}, subcollections={'prontuarios': FakeColl([pr])})
    fake = FakeDB({'pacientes': FakeColl([paciente])})
    monkeypatch.setattr(fs, 'db', fake)

    got = fs.obter_prontuario('pr1')
    assert got is not None and got.get('paciente_uid') == 'p1'

    # atualizar_prontuario should call update and return True
    # replace pr.reference with a ref that records update
    pr.reference = FakeRef('pr1')
    updated = fs.atualizar_prontuario('pr1', {'x': 1})
    assert updated is True

    # excluir
    pr.reference = FakeRef('pr1')
    deleted = fs.excluir_prontuario('pr1')
    assert deleted is True


def test_horarios_and_update_set_fallback(monkeypatch):
    # horarios in profissional subcollection
    ref_ok = FakeRef('h1')
    doc_h = FakeDoc('h1', {'data': '2020-02-02', 'hora': '08:00', 'disponivel': True}, ref=ref_ok)
    prof = FakeDoc('pr1', {'nome': 'P'}, subcollections={'horarios': FakeColl([doc_h]), 'consultas': FakeColl([])})

    # profissional doc for update fallback
    prof_doc = FakeDoc('prX', {'nome': 'PX'})
    prof_ref_fail = FakeRef('prX', fail_update=True)
    prof_doc.reference = prof_ref_fail

    fake = FakeDB({
        'profissionais': FakeColl([prof_doc, prof]),
    })
    monkeypatch.setattr(fs, 'db', fake)

    # marcar reservado
    cnt = fs.marcar_horario_reservado('pr1', '2020-02-02', '08:00')
    assert cnt == 1
    assert ref_ok.updated is True

    # atualizar_profissional should fallback to set when update fails
    ok = fs.atualizar_profissional('prX', {'y': 2})
    assert ok is True
    assert prof_ref_fail.set_called is True

    # atualizar_clinica fallback
    clin_ref = FakeRef('clX', fail_update=True)
    clin_doc = FakeDoc('clX', {'nome': 'C'})
    clin_doc.reference = clin_ref
    fake = FakeDB({'clinicas': FakeColl([clin_doc])})
    monkeypatch.setattr(fs, 'db', fake)
    ok2 = fs.atualizar_clinica('clX', {'z': 3})
    assert ok2 is True
    assert clin_ref.set_called is True
