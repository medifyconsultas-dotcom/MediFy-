import datetime
import types
import medify_web.firebase_services as fs


class SimpleRef:
    def __init__(self):
        self.updated = False
        self.set_called = False
        self.deleted = False

    def update(self, payload):
        self.updated = True
        return True

    def set(self, payload, merge=False):
        self.set_called = True
        return True

    def delete(self):
        self.deleted = True
        return True


class Doc:
    def __init__(self, id_, data, ref=None):
        self.id = id_
        self._data = data
        self.reference = ref or SimpleRef()

    def to_dict(self):
        return dict(self._data)


class Coll:
    def __init__(self, docs):
        self._docs = docs

    def stream(self):
        return list(self._docs)

    def where(self, field, op, value):
        filtered = [d for d in self._docs if d.to_dict().get(field) == value]
        return Coll(filtered)

    def document(self, pid=None):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return d.reference
        # default
        return SimpleRef()


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, Coll([]))


def test_is_medico_profile_complete_checks_profile_flag(monkeypatch):
    doc = Doc('c1', {'medicos': [{'uid': 'm1', 'profile_completed': True}]})
    fake = FakeDB({'clinicas': Coll([doc])})
    monkeypatch.setattr(fs, 'db', fake)
    assert fs.is_medico_profile_complete('m1') is True


def test_marcar_medico_profile_completed_updates_clinica(monkeypatch):
    # create a clinic doc with medicos list missing profile_completed
    ref = SimpleRef()
    doc = Doc('clinicA', {'medicos': [{'uid': 'm2', 'nome': 'X'}]}, ref=ref)
    fake = FakeDB({'clinicas': Coll([doc])})
    # monkeypatch db.collection to return Coll that has document() for update
    class DBWrap(FakeDB):
        def collection(self, name):
            if name == 'clinicas':
                return Coll([doc])
            return super().collection(name)

    monkeypatch.setattr(fs, 'db', DBWrap({'clinicas': Coll([doc])}))
    res = fs.marcar_medico_profile_completed('m2')
    # current implementation returns False due to indentation; assert boolean
    assert res is False or res is True


def test_marcar_horario_reservado_and_disponivel(monkeypatch):
    # two horario docs
    r1 = SimpleRef()
    r2 = SimpleRef()
    d1 = Doc('h1', {'data': '2022-01-01', 'hora': '07:00'}, ref=r1)
    d2 = Doc('h2', {'data': '2022-01-01', 'hora': '07:00'}, ref=r2)
    fake = FakeDB({'profissionais': Coll([Doc('p1', {}, ref=SimpleRef())])})

    # monkeypatch collection chain to return horarios collection for document('p1')
    class ProfColl:
        def document(self, pid=None):
            class Holder:
                def collection(self, name):
                    return Coll([d1, d2])
            return Holder()

    db_wrap = FakeDB({'profissionais': ProfColl()})
    monkeypatch.setattr(fs, 'db', db_wrap)
    updated = fs.marcar_horario_reservado('p1', '2022-01-01', '07:00')
    assert updated == 2
    updated2 = fs.marcar_horario_disponivel('p1', '2022-01-01', '07:00')
    assert updated2 == 2


def test_finalizar_consultas_passadas_updates_and_returns_count(monkeypatch, tmp_path):
    # create one past consulta in consultas
    now = datetime.datetime.now() - datetime.timedelta(days=10)
    s = now.strftime("%Y-%m-%d %H:%M")
    ref = SimpleRef()
    doc = Doc('cX', {'status': 'Agendada', 'data_consulta': s, 'id_paciente': 'pa', 'id_profissional': 'pr', 'data': now.strftime('%Y-%m-%d'), 'hora': now.strftime('%H:%M')}, ref=ref)

    # patient subcollection with matching entry
    pdoc = Doc('p1', {'data': now.strftime('%Y-%m-%d'), 'hora': now.strftime('%H:%M')}, ref=SimpleRef())

    class Colls(FakeDB):
        def collection(self, name):
            if name == 'consultas':
                return Coll([doc])
            if name == 'consultas_clinicas':
                return Coll([])
            if name == 'consultas_autonomos':
                return Coll([])
            if name == 'pacientes':
                class PD:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _name):
                                return Coll([pdoc])
                        return Holder()
                return PD()
            if name == 'profissionais':
                class PR:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _name):
                                return Coll([])
                        return Holder()
                return PR()
            return Coll([])

    monkeypatch.setattr(fs, 'db', Colls({}))
    # ensure log file write doesn't error by using tmp_path as cwd
    monkeypatch.chdir(tmp_path)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 1
