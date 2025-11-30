import types
import medify_web.firebase_services as fs


class Ref:
    def __init__(self):
        self.deleted = False

    def delete(self):
        self.deleted = True
        return True


class Doc:
    def __init__(self, id_, data, ref=None, subcollections=None):
        self.id = id_
        self._data = data
        self.reference = ref or Ref()
        self.subcollections = subcollections or {}

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class Coll:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def where(self, field, op, value):
        filtered = []
        for d in self._docs:
            try:
                if d.to_dict().get(field) == value:
                    filtered.append(d)
            except Exception:
                continue
        return Coll(filtered)

    def document(self, pid=None):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                return d
        return Doc(pid, None)

    def add(self, dados):
        return (Ref(), 'newid')


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, Coll([]))


def test_remover_consultas_por_chave_removes_both_sides(monkeypatch):
    # paciente subcollection has one matching doc
    pd = Doc('pdoc', {'profissional_uid': 'pr1', 'paciente_uid': 'pa', 'data': '2022-02-02', 'hora': '09:00'}, ref=Ref())
    pcoll = Coll([pd])

    # profissional subcollection has one matching doc
    prd = Doc('prdoc', {'profissional_uid': 'pr1', 'paciente_uid': 'pa', 'data': '2022-02-02', 'hora': '09:00'}, ref=Ref())
    prcoll = Coll([prd])

    class DB:
        def collection(self, name):
            if name == 'pacientes':
                class P:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _):
                                return pcoll
                        return Holder()
                return P()
            if name == 'profissionais':
                class R:
                    def document(self, pid=None):
                        class Holder:
                            def collection(self, _):
                                return prcoll
                        return Holder()
                return R()
            return Coll([])

    monkeypatch.setattr(fs, 'db', DB())
    removed = fs.remover_consultas_por_chave(paciente_uid='pa', profissional_uid='pr1', data_str='2022-02-02', hora_str='09:00')
    assert removed == 2


def test_listar_medicos_clinicas_filters_and_normalizes(monkeypatch):
    # One non-medico, one medico, and one doc with invalid snapshot
    d1 = Doc('d1', {'cargo': 'enfermeiro', 'nome': 'E1'})
    d2 = Doc('d2', {'cargo': 'medico', 'nome': 'Dr X', 'especialidade': 'Cardiologia', 'crm': '123', 'idClinica': 'c1'})
    class Broken:
        pass

    fake = FakeDB({'funcionarios': Coll([d1, d2, Broken()])})
    monkeypatch.setattr(fs, 'db', fake)
    # bypass in-process timed cache to get fresh result
    res = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(res, list)
    assert any(r.get('uid') == 'd2' or r.get('nome') == 'Dr X' for r in res)


def test_listar_funcionarios_handles_subcollection(monkeypatch):
    # simulate db.collection('funcionarios').document(id).collection('funcionarios')
    f1 = Doc('f1', {'nome': 'A'})
    class RootColl:
        def document(self, pid=None):
            class Holder:
                def collection(self, name):
                    return Coll([f1])
            return Holder()

    monkeypatch.setattr(fs, 'db', FakeDB({'funcionarios': RootColl()}))
    res = fs.listar_funcionarios('someclinic')
    assert isinstance(res, list)
    assert res[0].get('nome') == 'A'


def test_obter_clinica_por_recepcionista_returns_doc_with_id(monkeypatch):
    cdoc = Doc('cid', {'recepcionistas': [{'uid': 'r1'}]})
    fake = FakeDB({'clinicas': Coll([cdoc])})
    monkeypatch.setattr(fs, 'db', fake)
    out = fs.obter_clinica_por_recepcionista('r1')
    assert out is not None
    assert out.get('id') == 'cid'
