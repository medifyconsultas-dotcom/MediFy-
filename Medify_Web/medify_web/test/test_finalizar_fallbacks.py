import datetime
import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self):
        self.update_called = False
        self.set_called = False
        self.set_args = None

    def update(self, payload):
        self.update_called = True
        raise Exception("simulated update failure")

    def set(self, payload, merge=False):
        self.set_called = True
        self.set_args = (payload, merge)
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
        # ignore filters for test simplicity; allow chaining where().where().stream()
        return self

    def document(self, pid):
        # return a FakeRef for direct document access
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return d.reference
        # default fallback
        return FakeRef()

    def stream(self):
        return list(self._docs)


class FakeDB:
    def __init__(self, mapping):
        # mapping: collection_name -> FakeColl
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_finalizar_consultas_passadas_update_set_and_subcollections(monkeypatch):
    now = datetime.datetime.now()
    past = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M")

    # main consulta doc that will be picked by where('status','==','Agendada')
    main_ref = FakeRef()
    main_doc = FakeDoc('c1', {'data_consulta': past, 'status': 'Agendada', 'id_paciente': 'p1', 'id_profissional': 'pr1'}, ref=main_ref)

    # patient subcollection doc
    p_ref = FakeRef()
    p_doc = FakeDoc('csub1', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'profissional_uid': 'pr1'}, ref=p_ref)

    # professional subcollection doc
    pr_ref = FakeRef()
    pr_doc = FakeDoc('prsub1', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'paciente_uid': 'p1'}, ref=pr_ref)

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

    # main document fallback set must have been called because update raises
    assert main_ref.set_called is True
    # subcollection entries should have received set via fallback as well
    assert p_ref.set_called is True or p_ref.update_called is True
    assert pr_ref.set_called is True or pr_ref.update_called is True
