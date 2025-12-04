import datetime
import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self, fail_update=True, fail_set=False):
        self.update_called = False
        self.set_called = False
        self.fail_update = fail_update
        self.fail_set = fail_set

    def update(self, payload):
        self.update_called = True
        if self.fail_update:
            raise Exception('update failed')
        return True

    def set(self, payload, merge=False):
        if self.fail_set:
            raise Exception('set failed')
        self.set_called = True
        return True


class FakeDoc:
    def __init__(self, id_, data, ref=None):
        self.id = id_
        self._data = data
        self.reference = ref or FakeRef()

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


def test_finalizar_clinicas_and_autonomos_update_set(monkeypatch):
    now = datetime.datetime.now()
    past = (now - datetime.timedelta(days=3)).strftime('%Y-%m-%d %H:%M')

    # one doc in consultas_clinicas
    ref_clinic = FakeRef(fail_update=True, fail_set=False)
    doc_clinic = FakeDoc('cc1', {'data_consulta': past, 'status': 'Agendada', 'id_paciente': 'p1', 'id_profissional': 'pr1'}, ref=ref_clinic)

    # one doc in consultas_autonomos
    ref_auto = FakeRef(fail_update=True, fail_set=False)
    doc_auto = FakeDoc('ca1', {'data_consulta': past, 'status': 'Agendada', 'id_paciente': 'p2', 'id_profissional': 'pr2'}, ref=ref_auto)

    # patient/profissional subcollection entries
    p_ref = FakeRef(fail_update=True, fail_set=False)
    p_doc = FakeDoc('p1c', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'profissional_uid': 'pr1'}, ref=p_ref)

    pr_ref = FakeRef(fail_update=True, fail_set=False)
    pr_doc = FakeDoc('pr1c', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'paciente_uid': 'p1'}, ref=pr_ref)

    fake = FakeDB({
        'consultas': FakeColl([]),
        'consultas_clinicas': FakeColl([doc_clinic]),
        'consultas_autonomos': FakeColl([doc_auto]),
        'pacientes': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([p_doc]))),
        'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([pr_doc])))
    })

    monkeypatch.setattr(fs, 'db', fake)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 2
    assert ref_clinic.set_called is True
    assert ref_auto.set_called is True
    assert p_ref.set_called or p_ref.update_called
    assert pr_ref.set_called or pr_ref.update_called


def test_finalizar_autonomos_with_data_and_hora_fields(monkeypatch):
    now = datetime.datetime.now()
    past_date = (now - datetime.timedelta(days=4)).strftime('%Y-%m-%d')
    past_hour = (now - datetime.timedelta(days=4)).strftime('%H:%M')

    ref_auto = FakeRef(fail_update=True, fail_set=False)
    # no data_consulta, but has data and hora fields
    doc_auto = FakeDoc('ca2', {'data': past_date, 'hora': past_hour, 'status': 'Agendada', 'id_paciente': 'p3', 'id_profissional': 'pr3'}, ref=ref_auto)

    p_ref = FakeRef(fail_update=True, fail_set=False)
    p_doc = FakeDoc('p3c', {'data': past_date, 'hora': past_hour, 'profissional_uid': 'pr3'}, ref=p_ref)

    pr_ref = FakeRef(fail_update=True, fail_set=False)
    pr_doc = FakeDoc('pr3c', {'data': past_date, 'hora': past_hour, 'paciente_uid': 'p3'}, ref=pr_ref)

    fake = FakeDB({
        'consultas': FakeColl([]),
        'consultas_clinicas': FakeColl([]),
        'consultas_autonomos': FakeColl([doc_auto]),
        'pacientes': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([p_doc]))),
        'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([pr_doc])))
    })

    monkeypatch.setattr(fs, 'db', fake)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 1
    assert ref_auto.set_called is True
    assert p_ref.set_called or p_ref.update_called
    assert pr_ref.set_called or pr_ref.update_called
