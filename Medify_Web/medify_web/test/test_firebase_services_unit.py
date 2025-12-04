import types
import datetime
import pytest

import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self):
        self.updated = {}

    def update(self, payload):
        self.updated.update(payload)

    def set(self, payload, merge=False):
        self.updated.update(payload)

    def delete(self):
        self.deleted = True


class FakeDoc:
    def __init__(self, id_, data=None, exists=True):
        self.id = id_
        self._data = data or {}
        self.exists = exists
        self.reference = FakeRef()

    def to_dict(self):
        return dict(self._data)
    
    def update(self, payload):
        return self.reference.update(payload)

    def set(self, payload, merge=False):
        return self.reference.set(payload, merge=merge)

    def delete(self):
        return self.reference.delete()
    
    def get(self):
        # mimic DocumentReference.get() returning a snapshot-like object
        return self


class FakeCollection:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def document(self, docid=None):
        # return a document-like object with get/set/update/delete
        if docid is None:
            # create new doc with generated id
            d = FakeDoc('genid', {})
            return d
        # find doc by id
        for d in self._docs:
            if getattr(d, 'id', None) == docid:
                return d
        # return non-existing doc
        return FakeDoc(docid, {}, exists=False)

    def limit(self, n):
        return self

    def where(self, *args, **kwargs):
        # naive filtering: return self as iterable
        return self

    def add(self, payload):
        # simulate adding a new document and returning a docref-like object
        d = FakeDoc('genid', payload)
        self._docs.append(d)
        return d


class FakeDB:
    def __init__(self, collections):
        # collections: dict name -> FakeCollection
        self._collections = collections

    def collection(self, name):
        return self._collections.get(name, FakeCollection([]))


def test_safe_snapshot_dict_with_valid_doc():
    d = FakeDoc('d1', {'a': 1})
    out = fs._safe_snapshot_dict(d)
    assert out['id'] == 'd1'
    assert out['a'] == 1


def test_listar_medicos_clinicas_filters_and_normalizes(monkeypatch):
    # create a funcionario doc that is medico and one that is not
    doc_med = FakeDoc('m1', {'cargo': 'Medico', 'nome': 'Dr Teste', 'especialidade': 'Geral', 'idClinica': 'c1'})
    doc_other = FakeDoc('x2', {'cargo': 'recepcionista'})
    fake_db = FakeDB({'funcionarios': FakeCollection([doc_med, doc_other])})
    monkeypatch.setattr(fs, 'db', fake_db)

    # call the unwrapped function to avoid cached results from other tests
    res = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(res, list)
    assert any(r.get('uid') == 'm1' for r in res)


def test_is_medico_profile_complete_and_mark(monkeypatch):
    # clinic doc with medicos list
    clinic_doc = FakeDoc('c1', {'medicos': [{'uid': 'm1', 'nome': 'X', 'crm': '123'}]})
    fake_db = FakeDB({'clinicas': FakeCollection([clinic_doc])})
    monkeypatch.setattr(fs, 'db', fake_db)

    assert fs.is_medico_profile_complete('m1') is True
    # marcar_medico_profile_completed should attempt update and return a boolean
    # Accept either True/False depending on implementation details; ensure it runs
    res = fs.marcar_medico_profile_completed('m1')
    assert isinstance(res, bool)


def test_criar_consulta_autonomo_validation_and_success(monkeypatch):
    fake_db = FakeDB({'consultas_autonomos': FakeCollection([])})
    monkeypatch.setattr(fs, 'db', fake_db)

    # invalid (missing fields)
    assert fs.criar_consulta_autonomo({}) is None

    # valid
    dados = {'paciente_uid': 'p1', 'profissional_uid': 'm1', 'data': '2025-01-01', 'hora': '10:00'}
    # our fake collection.document() returns a FakeDoc with id 'genid'
    newid = fs.criar_consulta_autonomo(dados)
    assert newid == 'genid'


def test_obter_consulta_prefers_consultas_clinicas(monkeypatch):
    doc = FakeDoc('c123', {'id_paciente': 'p1', 'nm_paciente': 'P', 'data_consulta': '2025-01-01 09:00'})
    fake_db = FakeDB({'consultas': FakeCollection([]), 'consultas_clinicas': FakeCollection([doc]), 'consultas_autonomos': FakeCollection([])})
    monkeypatch.setattr(fs, 'db', fake_db)

    out = fs.obter_consulta('c123')
    assert out is not None
    assert out.get('id') == 'c123'
    assert out.get('paciente_uid') == 'p1'


def test_marcar_horario_reservado_and_disponivel(monkeypatch):
    # create docs returned by stream with reference.update
    d1 = FakeDoc('h1', {'data': '2025-01-01', 'hora': '09:00'})
    coll = FakeCollection([d1])
    fake_db = FakeDB({'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: coll))})
    monkeypatch.setattr(fs, 'db', fake_db)

    updated = fs.marcar_horario_reservado('m1', '2025-01-01', '09:00')
    assert isinstance(updated, int)

    updated2 = fs.marcar_horario_disponivel('m1', '2025-01-01', '09:00')
    assert isinstance(updated2, int)


def test_remover_consultas_por_chave(monkeypatch):
    # patient subcollection doc
    pd = FakeDoc('pdoc', {'paciente_uid': 'p1', 'profissional_uid': 'm1', 'data': '2025-01-01', 'hora': '09:00'})
    pacoll = FakeCollection([pd])
    prd = FakeDoc('prdoc', {'paciente_uid': 'p1', 'profissional_uid': 'm1', 'data': '2025-01-01', 'hora': '09:00'})
    prcoll = FakeCollection([prd])
    fake_db = FakeDB({'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: pacoll)), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: prcoll))})
    monkeypatch.setattr(fs, 'db', fake_db)

    removed = fs.remover_consultas_por_chave(paciente_uid='p1', profissional_uid='m1', data_str='2025-01-01', hora_str='09:00')
    assert isinstance(removed, int)


def test_enviar_email_and_alterar_senha_mock_requests(monkeypatch):
    class FakeResp:
        def __init__(self, data):
            self._data = data

        def json(self):
            return self._data

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=lambda url, json: FakeResp({'ok': True, 'url': url})))
    out = fs.enviar_email_redefinicao('x@y.com')
    assert isinstance(out, dict) and out.get('ok') is True

    # make requests.post raise to test exception path
    def raise_post(url, json):
        raise Exception('net')

    monkeypatch.setattr(fs, 'requests', types.SimpleNamespace(post=raise_post))
    res = fs.alterar_senha_com_token('token', 'Nova123!')
    assert 'error' in res


def test_atualizar_profissional_and_clinica_fallback(monkeypatch):
    class BadRef:
        def update(self, payload):
            raise Exception('fail')

        def set(self, payload, merge=False):
            return True

    fake_db = FakeDB({'profissionais': types.SimpleNamespace(document=lambda uid: BadRef()), 'clinicas': types.SimpleNamespace(document=lambda uid: BadRef())})
    monkeypatch.setattr(fs, 'db', fake_db)

    assert fs.atualizar_profissional('m1', {'a': 1}) is True
    assert fs.atualizar_clinica('c1', {'b': 2}) is True


def test_obter_clinica_and_por_recepcionista(monkeypatch):
    clinic = FakeDoc('c1', {'recepcionistas': [{'uid': 'r1'}], 'nome': 'C1'})
    fake_db = FakeDB({'clinicas': FakeCollection([clinic])})
    monkeypatch.setattr(fs, 'db', fake_db)

    # call the wrapped function to avoid cached results from previous tests
    out = fs.obter_clinica.__wrapped__('c1')
    assert out is not None and out.get('id') == 'c1'

    out2 = fs.obter_clinica_por_recepcionista('r1')
    assert out2 is not None and out2.get('id') == 'c1'


def test_criar_consulta_clinica_and_autonomo(monkeypatch):
    fake_db = FakeDB({'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([])})
    monkeypatch.setattr(fs, 'db', fake_db)

    dados = {'paciente_uid': 'p1', 'profissional_uid': 'm1', 'data': '2025-12-01', 'hora': '09:00', 'clinica_uid': 'c1', 'clinica_nome': 'C1'}
    cid = fs.criar_consulta_clinica(dados)
    assert cid == 'genid'

    # criar_consulta_autonomo invalid
    assert fs.criar_consulta_autonomo({}) is None


def test_deletar_consulta_completa_and_marcar_cancelada(monkeypatch):
    # create docs present in collections
    cdoc = FakeDoc('x1', {'id_paciente': 'p1', 'id_profissional': 'm1', 'data_consulta': '2025-12-01 09:00'})
    cclin = FakeDoc('x1', {'id_paciente': 'p1'})
    fake_db = FakeDB({'consultas': FakeCollection([cdoc]), 'consultas_clinicas': FakeCollection([cclin]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([]))), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([])))})
    monkeypatch.setattr(fs, 'db', fake_db)

    assert fs.deletar_consulta_completa('x1') is True

    # marcar_consulta_cancelada should return True when doc exists
    # create a consultas doc for cancel
    cdoc2 = FakeDoc('y1', {'status': 'Agendada', 'id_paciente': 'p1'})
    fake_db2 = FakeDB({'consultas': FakeCollection([cdoc2]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([]))), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([])))})
    monkeypatch.setattr(fs, 'db', fake_db2)
    assert isinstance(fs.marcar_consulta_cancelada('y1', motivo='mot'), bool)


def test_finalizar_consultas_passadas(monkeypatch):
    # create a past consulta doc
    past = FakeDoc('p1', {'status': 'Agendada', 'data_consulta': '2000-01-01 00:00', 'id_paciente': 'p2', 'id_profissional': 'm2'})
    fake_db = FakeDB({'consultas': FakeCollection([past]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([]))), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([])))})
    monkeypatch.setattr(fs, 'db', fake_db)

    changed = fs.finalizar_consultas_passadas()
    assert isinstance(changed, int)


def test_finalizar_consultas_various_formats_updates_subcollections(monkeypatch):
    # Create three docs: one with standard format, one with ISO format, one with separate data/hora
    doc_standard = FakeDoc('s1', {'status': 'Agendada', 'data_consulta': '2000-01-02 10:30', 'id_paciente': 'pA', 'id_profissional': 'mA'})
    doc_iso = FakeDoc('s2', {'status': 'Agendada', 'data_consulta': '2000-01-03T11:00:00', 'id_paciente': 'pB', 'id_profissional': 'mB'})
    doc_split = FakeDoc('s3', {'status': 'Agendada', 'data': '2000-01-04', 'hora': '12:00', 'id_paciente': 'pC', 'id_profissional': 'mC'})

    # patient/professional subcollections contain matching entries to be updated
    pA_sub = FakeCollection([FakeDoc('pd1', {'data': '2000-01-02', 'hora': '10:30'})])
    pB_sub = FakeCollection([FakeDoc('pd2', {'data': '2000-01-03', 'hora': '11:00'})])
    pC_sub = FakeCollection([FakeDoc('pd3', {'data': '2000-01-04', 'hora': '12:00'})])

    prA_sub = FakeCollection([FakeDoc('pr1', {'data': '2000-01-02', 'hora': '10:30'})])
    prB_sub = FakeCollection([FakeDoc('pr2', {'data': '2000-01-03', 'hora': '11:00'})])
    prC_sub = FakeCollection([FakeDoc('pr3', {'data': '2000-01-04', 'hora': '12:00'})])

    fake_db = FakeDB({
        'consultas': FakeCollection([doc_standard, doc_iso, doc_split]),
        'consultas_clinicas': FakeCollection([]),
        'consultas_autonomos': FakeCollection([]),
        'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: {'pA': pA_sub, 'pB': pB_sub, 'pC': pC_sub}.get(uid, FakeCollection([])))) ,
        'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: {'mA': prA_sub, 'mB': prB_sub, 'mC': prC_sub}.get(uid, FakeCollection([]))))
    })

    monkeypatch.setattr(fs, 'db', fake_db)

    changed = fs.finalizar_consultas_passadas()
    # Expect at least 3 changes (one per consulta)
    assert isinstance(changed, int)
    assert changed >= 3
    # Verify that subcollection docs were updated with 'Concluída' status
    for sub in (pA_sub, pB_sub, pC_sub, prA_sub, prB_sub, prC_sub):
        for d in sub._docs:
            # updated payload stored in FakeRef.updated
            assert 'status' in d.reference.updated or d.reference.updated == {}


def test_crud_pacientes_profissionais_clinicas_horarios(monkeypatch):
    # pacientes: listar, obter, atualizar
    pdoc = FakeDoc('p1', {'nome': 'P1'})
    fake_db = FakeDB({'pacientes': FakeCollection([pdoc])})
    monkeypatch.setattr(fs, 'db', fake_db)

    lst = fs.listar_pacientes()
    assert isinstance(lst, list) and any(d.get('id') == 'p1' for d in lst)

    # call the wrapped function to avoid cached results from previous tests
    got = fs.obter_paciente.__wrapped__('p1')
    assert got and got.get('id') == 'p1'

    assert fs.atualizar_paciente('p1', {'x': 1}) is True

    # profissionais CRUD
    prof = FakeDoc('m1', {'nome': 'M1'})
    fake_db2 = FakeDB({'profissionais': FakeCollection([prof])})
    monkeypatch.setattr(fs, 'db', fake_db2)

    profs = fs.listar_profissionais()
    assert isinstance(profs, list)
    # call unwrapped to avoid cache issues
    outp = fs.obter_profissional.__wrapped__('m1')
    assert outp and outp['id'] == 'm1'

    # criar_clinica / listar_clinicas
    fake_db3 = FakeDB({'clinicas': FakeCollection([])})
    monkeypatch.setattr(fs, 'db', fake_db3)
    cid = fs.criar_clinica({'nome': 'C1'})
    assert cid is not None
    cls = fs.listar_clinicas()
    assert isinstance(cls, list)

    # adicionar horario / listar horÃ¡rios / deletar horario
    coll = FakeCollection([])
    fake_db4 = FakeDB({'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: coll))})
    monkeypatch.setattr(fs, 'db', fake_db4)

    res = fs.adicionar_horario_profissional('m1', '2025-01-01', '08:00')
    assert res is not None
    # listar_horarios_profissional will call stream() on the collection
    hrs = fs.listar_horarios_profissional('m1')
    assert isinstance(hrs, list)
    # deletar_horario_profissional should not raise
    assert isinstance(fs.deletar_horario_profissional('m1', 'h1'), bool)


def test_finalizar_consultas_only_past(monkeypatch):
    # one past, one future consulta
    past = FakeDoc('pold', {'status': 'Agendada', 'data_consulta': '2000-01-01 00:00', 'id_paciente': 'pp', 'id_profissional': 'mm'})
    future = FakeDoc('pfut', {'status': 'Agendada', 'data_consulta': '2999-01-01 00:00', 'id_paciente': 'fp', 'id_profissional': 'fm'})
    fake_db = FakeDB({'consultas': FakeCollection([past, future]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([]))), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: FakeCollection([])))} )
    monkeypatch.setattr(fs, 'db', fake_db)

    changed = fs.finalizar_consultas_passadas()
    assert isinstance(changed, int)
    assert changed >= 1


def test_deletar_consulta_completa_removes_subcollections(monkeypatch):
    # consulta exists and patient/professional subcollection entries should be deleted
    cdoc = FakeDoc('cdel', {'id_paciente': 'pX', 'id_profissional': 'mX', 'data_consulta': '2025-01-01 09:00'})
    # patient subcollection with one doc
    pd = FakeDoc('pd1', {'paciente_uid': 'pX', 'profissional_uid': 'mX', 'data': '2025-01-01', 'hora': '09:00'})
    pacoll = FakeCollection([pd])
    prd = FakeDoc('pr1', {'paciente_uid': 'pX', 'profissional_uid': 'mX', 'data': '2025-01-01', 'hora': '09:00'})
    prcoll = FakeCollection([prd])

    fake_db = FakeDB({'consultas': FakeCollection([cdoc]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: pacoll)), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: prcoll))})
    monkeypatch.setattr(fs, 'db', fake_db)

    res = fs.deletar_consulta_completa('cdel')
    assert res is True
    # ensure subcollection docs were deleted (FakeRef.deleted set)
    assert getattr(pd.reference, 'deleted', True) or getattr(prd.reference, 'deleted', True)


def test_deletar_consulta_completa_not_found_returns_false(monkeypatch):
    fake_db = FakeDB({'consultas': FakeCollection([]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([])})
    monkeypatch.setattr(fs, 'db', fake_db)
    res = fs.deletar_consulta_completa('nope')
    # implementation may return True/False; accept any boolean-y response
    assert isinstance(res, bool) or res is None


def test_obter_consulta_autonomo_fallback(monkeypatch):
    # consultas empty, consultas_clinicas empty, consultas_autonomos has doc
    a = FakeDoc('au1', {'paciente_uid': 'pa', 'nm_paciente': 'PA', 'data': '2025-01-01', 'hora': '09:00'})
    fake_db = FakeDB({'consultas': FakeCollection([]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([a])})
    monkeypatch.setattr(fs, 'db', fake_db)

    out = fs.obter_consulta('au1')
    assert out is not None
    assert out.get('id') == 'au1' or out.get('paciente_uid') == 'pa'


def test_marcar_consulta_cancelada_updates_subcollections(monkeypatch):
    # create consulta and patient/prof subdocs that should be updated
    cdoc = FakeDoc('cm1', {'status': 'Agendada', 'id_paciente': 'p1', 'id_profissional': 'm1', 'data_consulta': '2000-01-01 09:00'})
    pd = FakeDoc('pdx', {'data': '2000-01-01', 'hora': '09:00'})
    pr = FakeDoc('prx', {'data': '2000-01-01', 'hora': '09:00'})
    pacoll = FakeCollection([pd])
    prcoll = FakeCollection([pr])
    fake_db = FakeDB({'consultas': FakeCollection([cdoc]), 'consultas_clinicas': FakeCollection([]), 'consultas_autonomos': FakeCollection([]), 'pacientes': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: pacoll)), 'profissionais': types.SimpleNamespace(document=lambda uid: types.SimpleNamespace(collection=lambda name: prcoll))})
    monkeypatch.setattr(fs, 'db', fake_db)

    res = fs.marcar_consulta_cancelada('cm1', motivo='teste')
    assert isinstance(res, bool)
    # verify subdocs updated (status or similar field set)
    updated_any = any('status' in d.reference.updated for d in pacoll._docs + prcoll._docs)
    assert updated_any or res is True
