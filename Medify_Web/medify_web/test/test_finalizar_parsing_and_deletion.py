import datetime
import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self):
        self.update_called = False
        self.set_called = False
        self.delete_called = False
        self.set_args = None

    def update(self, payload):
        self.update_called = True
        raise Exception("simulated update failure")

    def set(self, payload, merge=False):
        self.set_called = True
        self.set_args = (payload, merge)
        return True

    def delete(self):
        self.delete_called = True
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

    def document(self, pid):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return types.SimpleNamespace(get=lambda: types.SimpleNamespace(exists=True), delete=lambda: True)
        return types.SimpleNamespace(get=lambda: types.SimpleNamespace(exists=False), delete=lambda: False)


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_finalizar_with_strptime_parsing_and_subcollections(monkeypatch):
    now = datetime.datetime.now()
    past_dt = now - datetime.timedelta(days=2)
    # use space-separated format to exercise strptime branch and subcollection updates
    datahora = past_dt.strftime('%Y-%m-%d %H:%M')

    main_ref = FakeRef()
    main_doc = FakeDoc('iso1', {'data_consulta': datahora, 'status': 'Agendada', 'id_paciente': 'p1', 'id_profissional': 'pr1'}, ref=main_ref)

    p_ref = FakeRef()
    p_doc = FakeDoc('p1c', {'data': past_dt.strftime('%Y-%m-%d'), 'hora': past_dt.strftime('%H:%M'), 'profissional_uid': 'pr1'}, ref=p_ref)

    pr_ref = FakeRef()
    pr_doc = FakeDoc('pr1c', {'data': past_dt.strftime('%Y-%m-%d'), 'hora': past_dt.strftime('%H:%M'), 'paciente_uid': 'p1'}, ref=pr_ref)

    fake = FakeDB({
        'consultas': FakeColl([main_doc]),
        'consultas_clinicas': FakeColl([]),
        'consultas_autonomos': FakeColl([]),
        'pacientes': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([p_doc]))),
        'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([pr_doc])))
    })

    monkeypatch.setattr(fs, 'db', fake)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 1
    assert main_ref.set_called is True
    assert p_ref.set_called or p_ref.update_called
    assert pr_ref.set_called or pr_ref.update_called


def test_finalizar_with_iso_parsing_no_subcollections(monkeypatch):
    # ISO formatted date should parse, but may not include space to derive subcollection keys
    now = datetime.datetime.now()
    past_dt = now - datetime.timedelta(days=2)
    iso = past_dt.isoformat(sep='T', timespec='seconds')

    main_ref = FakeRef()
    main_doc = FakeDoc('iso2', {'data_consulta': iso, 'status': 'Agendada'}, ref=main_ref)
    fake = FakeDB({'consultas': FakeColl([main_doc]), 'consultas_clinicas': FakeColl([]), 'consultas_autonomos': FakeColl([])})
    monkeypatch.setattr(fs, 'db', fake)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 1
    assert main_ref.set_called is True


def test_finalizar_with_invalid_date_skips(monkeypatch):
    # invalid date should be skipped, changed remains 0
    main_ref = FakeRef()
    main_doc = FakeDoc('bad1', {'data_consulta': 'not-a-date', 'status': 'Agendada'}, ref=main_ref)
    fake = FakeDB({'consultas': FakeColl([main_doc]), 'consultas_clinicas': FakeColl([]), 'consultas_autonomos': FakeColl([])})
    monkeypatch.setattr(fs, 'db', fake)
    changed = fs.finalizar_consultas_passadas()
    assert changed == 0


def test_deletar_consulta_completa_calls_removals(monkeypatch):
    # prepare flags
    top_deleted = {'called': False}

    class TopRef:
        def delete(self):
            top_deleted['called'] = True
            return True

    class ClinicDocRef:
        def get(self):
            return types.SimpleNamespace(exists=True)
        def delete(self):
            top_deleted['clinic_deleted'] = True
            return True

    # patient/professional subcollection docs
    pdoc_ref = FakeRef()
    pdoc = FakeDoc('pdoc1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '10:00'}, ref=pdoc_ref)
    prdoc_ref = FakeRef()
    prdoc = FakeDoc('prdoc1', {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '10:00'}, ref=prdoc_ref)

    fake = FakeDB({
        'consultas': types.SimpleNamespace(document=lambda pid: TopRef()),
        'consultas_clinicas': types.SimpleNamespace(document=lambda pid: ClinicDocRef()),
        'consultas_autonomos': FakeColl([]),
        'pacientes': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([pdoc]))),
        'profissionais': types.SimpleNamespace(document=lambda pid: types.SimpleNamespace(collection=lambda n: FakeColl([prdoc])))
    })

    # force obter_consulta to return normalized values so remover_consultas_por_chave is called
    monkeypatch.setattr(fs, 'db', fake)
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '10:00'})

    res = fs.deletar_consulta_completa('anyid')
    assert res is True
    assert top_deleted['called'] is True
    assert top_deleted.get('clinic_deleted', False) is True
    # subcollection deletions should have been attempted
    assert pdoc_ref.delete_called or pdoc_ref.set_called or pdoc_ref.update_called
    assert prdoc_ref.delete_called or prdoc_ref.set_called or prdoc_ref.update_called
