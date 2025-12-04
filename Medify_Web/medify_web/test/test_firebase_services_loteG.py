import datetime
import types
import medify_web.firebase_services as fs


class BadRef:
    def __init__(self):
        self.set_called = False
        self.updated = False

    def update(self, payload):
        raise Exception('forced update')

    def set(self, payload, merge=False):
        self.set_called = True
        return True


class GoodRef:
    def __init__(self):
        self.updated = False

    def update(self, payload):
        self.updated = True
        return True


class Doc:
    def __init__(self, id_, data, ref=None):
        self.id = id_
        self._data = data
        self.reference = ref or GoodRef()

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


def test_marcar_consulta_cancelada_uses_set_when_update_fails(monkeypatch):
    # top-level doc exists
    top_ref = BadRef()
    class TopColl:
        def document(self, pid=None):
            return types.SimpleNamespace(get=lambda: types.SimpleNamespace(exists=True), update=lambda p: top_ref.update(p), set=lambda p, merge=False: top_ref.set(p, merge=merge))

    # clinic/auton docs exist and will be updated via fallback
    bad_ref_clinic = BadRef()
    class CollRef:
        def document(self, pid=None):
            return types.SimpleNamespace(get=lambda: types.SimpleNamespace(exists=True), update=lambda p: bad_ref_clinic.update(p), set=lambda p, merge=False: bad_ref_clinic.set(p, merge=merge))

    # patient subcollection doc where update fails -> set called
    bad_patient_ref = BadRef()
    pdoc = Doc('p1', {'data': '2020-01-01', 'hora': '08:00'}, ref=bad_patient_ref)
    class PatientColl:
        def document(self, pid=None):
            class Holder:
                def collection(self, name):
                    return Coll([pdoc])
            return Holder()

    # profissional subcollection doc where update succeeds
    good_prof_ref = GoodRef()
    prdoc = Doc('pr1', {'data': '2020-01-01', 'hora': '08:00'}, ref=good_prof_ref)
    class ProfColl:
        def document(self, pid=None):
            class Holder:
                def collection(self, name):
                    return Coll([prdoc])
            return Holder()

    class DB:
        def collection(self, name):
            if name == 'consultas':
                return TopColl()
            if name in ('consultas_clinicas', 'consultas_autonomos'):
                return CollRef()
            if name == 'pacientes':
                return PatientColl()
            if name == 'profissionais':
                return ProfColl()
            return Coll([])

    monkeypatch.setattr(fs, 'db', DB())
    # obter_consulta returns normalized keys so subcollection updates run
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: {'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2020-01-01', 'hora': '08:00'})

    changed = fs.marcar_consulta_cancelada('cid', motivo='teste', liberar_horario=True)
    assert changed is True
    assert bad_ref_clinic.set_called or top_ref.set_called or bad_patient_ref.set_called


def test_finalizar_consultas_passadas_handles_multiple_formats_and_fallbacks(monkeypatch, tmp_path):
    now = datetime.datetime.now() - datetime.timedelta(days=5)
    s_strptime = now.strftime('%Y-%m-%d %H:%M')
    s_iso = now.isoformat()

    # doc with strptime format, update fails -> set called
    bad_ref = BadRef()
    d1 = Doc('d1', {'status': 'Agendada', 'data_consulta': s_strptime, 'id_paciente': 'pA', 'id_profissional': 'pR'}, ref=bad_ref)

    # doc with iso format, update succeeds
    good_ref = GoodRef()
    d2 = Doc('d2', {'status': 'Agendada', 'data_consulta': s_iso, 'id_paciente': 'pA', 'id_profissional': 'pR'}, ref=good_ref)

    # patient/professional subcollections have docs that will get update/set
    psub_bad = Doc('px', {'data': now.strftime('%Y-%m-%d'), 'hora': now.strftime('%H:%M')}, ref=BadRef())
    prsub_bad = Doc('qx', {'data': now.strftime('%Y-%m-%d'), 'hora': now.strftime('%H:%M')}, ref=BadRef())

    class Colls:
        def collection(self, name):
            return Coll([])

    class CollWhere:
        def __init__(self, docs):
            self._docs = docs
        def where(self, f, o, v):
            return self
        def stream(self):
            return [d1, d2]

    class DB:
        def collection(self, name):
            if name in ('consultas', 'consultas_clinicas', 'consultas_autonomos'):
                return CollWhere([d1, d2])
            if name == 'pacientes':
                class P:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _n):
                                return Coll([psub_bad])
                        return Holder()
                return P()
            if name == 'profissionais':
                class R:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _n):
                                return Coll([prsub_bad])
                        return Holder()
                return R()
            return Coll([])

    monkeypatch.setattr(fs, 'db', DB())
    monkeypatch.chdir(tmp_path)
    changed = fs.finalizar_consultas_passadas()
    assert changed >= 1
    # ensure at least one set was called from bad_ref
    assert bad_ref.set_called is True
