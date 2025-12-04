import pytest
from unittest.mock import MagicMock

import medify_web.firebase_services as fs


def make_doc(id, data):
    doc = MagicMock()
    doc.id = id
    doc.to_dict.return_value = data
    return doc


# Helper → garante suporte a .stream() e .limit().stream()
def make_collection_with_docs(docs):
    col = MagicMock()
    col.stream.return_value = docs
    col.limit.return_value.stream.return_value = docs
    return col


def test_tudo_firebase_services(monkeypatch):
    # 1. listar_medicos_clinicas
    mock_db = MagicMock()
    medico_data = {
        'cargo': 'medico',
        'nome': 'Dr. Teste',
        'especialidade': 'Cardiologia',
        'crm': 'CRM123',
        'idClinica': 'clinica_1'
    }
    other_data = {'cargo': 'recepcionista', 'nome': 'Recep'}

    doc_med = make_doc('doc_med', medico_data)
    doc_other = make_doc('doc_other', other_data)

    mock_collection = make_collection_with_docs([doc_med, doc_other])
    mock_db.collection.return_value = mock_collection
    monkeypatch.setattr(fs, 'db', mock_db)

    medicos = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(medicos, list)
    assert len(medicos) == 1
    m = medicos[0]
    assert m.get('cargo') == 'medico'
    assert m.get('nome') == 'Dr. Teste'
    assert m.get('especialidade') == 'Cardiologia'
    assert m.get('crm') == 'CRM123'
    assert m.get('clinica_uid') == 'clinica_1'

    # 2. is_medico_profile_complete (flag True)
    mock_db = MagicMock()
    clin_doc = make_doc('c1', {'medicos': [{'uid': 'med1', 'profile_completed': True}]})
    mock_db.collection.return_value = make_collection_with_docs([clin_doc])
    monkeypatch.setattr(fs, 'db', mock_db)
    assert fs.is_medico_profile_complete('med1') is True

    # 3. is_medico_profile_complete (fallback nome + crm)
    mock_db = MagicMock()
    clin_doc = make_doc('c2', {'medicos': [{'uid': 'med2', 'nome': 'Dr X', 'crm': '1234'}]})
    mock_db.collection.return_value = make_collection_with_docs([clin_doc])
    monkeypatch.setattr(fs, 'db', mock_db)
    assert fs.is_medico_profile_complete('med2') is True

    # 4. listar_clinicas & listar_pacientes
    mock_db = MagicMock()
    clin_doc = make_doc('c1', {'nome_fantasia': 'Clinica A'})
    pac_doc = make_doc('p1', {'nome': 'Paciente X'})

    def side_collection(name):
        if name == 'clinicas':
            return make_collection_with_docs([clin_doc])
        if name == 'pacientes':
            return make_collection_with_docs([pac_doc])
        return make_collection_with_docs([])

    mock_db.collection.side_effect = side_collection
    monkeypatch.setattr(fs, 'db', mock_db)

    clinicas = fs.listar_clinicas()
    pacientes = fs.listar_pacientes()
    assert clinicas[0]['nome_fantasia'] == 'Clinica A'
    assert pacientes[0]['nome'] == 'Paciente X'

    # 5. obter_paciente & obter_clinica
    mock_db = MagicMock()

    paciente_doc = MagicMock()
    paciente_doc.exists = True
    paciente_doc.id = 'p1'
    paciente_doc.to_dict.return_value = {'nome': 'Paciente X'}
    pac_ref = MagicMock()
    pac_ref.get.return_value = paciente_doc

    clin_doc = MagicMock()
    clin_doc.exists = True
    clin_doc.id = 'c1'
    clin_doc.to_dict.return_value = {'nome_fantasia': 'Clinica A'}
    clin_ref = MagicMock()
    clin_ref.get.return_value = clin_doc

    def side_coll(name):
        col = MagicMock()
        if name == 'pacientes':
            col.document.return_value = pac_ref
        if name == 'clinicas':
            col.document.return_value = clin_ref
        return col

    mock_db.collection.side_effect = side_coll
    monkeypatch.setattr(fs, 'db', mock_db)

    p = fs.obter_paciente.__wrapped__('p1')
    c = fs.obter_clinica.__wrapped__('c1')
    assert p['nome'] == 'Paciente X'
    assert c['nome_fantasia'] == 'Clinica A'

    # 6. criar_consulta_autonomo & obter_consulta
    mock_db = MagicMock()
    doc_ref = MagicMock()
    doc_ref.id = 'cons123'
    auto_col = MagicMock()
    auto_col.document.return_value = doc_ref

    consulta_doc = MagicMock()
    consulta_doc.exists = True
    consulta_doc.id = 'cons123'
    consulta_doc.to_dict.return_value = {
        'id_paciente': 'p1',
        'nm_paciente': 'Paciente X',
        'id_profissional': 'pr1',
        'nm_profissional': 'Dr Teste',
        'data_consulta': '2025-01-01 10:00',
        'nm_clinica': 'Clinica A'
    }

    clin_cons_col = MagicMock()
    clin_cons_col.document.return_value.get.return_value = consulta_doc

    def side(name):
        if name == 'consultas_autonomos':
            return auto_col
        if name == 'consultas_clinicas':
            return clin_cons_col
        if name == 'consultas':
            nd = MagicMock()
            nd.exists = False
            top = MagicMock()
            top.document.return_value.get.return_value = nd
            return top
        return MagicMock()

    mock_db.collection.side_effect = side
    monkeypatch.setattr(fs, 'db', mock_db)

    cid = fs.criar_consulta_autonomo({'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2025-01-01', 'hora': '10:00'})
    assert cid == 'cons123'

    found = fs.obter_consulta('cons123')
    assert found['origem'] in ('consultas_autonomos', 'consultas_clinicas')

    # 7. listar_profissionais & obter_profissional
    mock_db = MagicMock()
    prof_doc = make_doc('pr1', {'nome': 'Dr X', 'especialidade': 'Geral'})
    prof_doc_get = MagicMock()
    prof_doc_get.exists = True
    prof_doc_get.id = 'pr1'
    prof_doc_get.to_dict.return_value = {'nome': 'Dr X', 'especialidade': 'Geral'}

    prof_ref = MagicMock()
    prof_ref.get.return_value = prof_doc_get

    def side_prof(name):
        if name == 'profissionais':
            col = make_collection_with_docs([prof_doc])
            col.document.return_value = prof_ref
            return col
        return make_collection_with_docs([])

    mock_db.collection.side_effect = side_prof
    monkeypatch.setattr(fs, 'db', mock_db)

    profs = fs.listar_profissionais.__wrapped__()
    p = fs.obter_profissional.__wrapped__('pr1')

    assert profs[0]['nome'] == 'Dr X'
    assert p['nome'] == 'Dr X'

    # 8. horarios mark
    mock_db = MagicMock()
    horario_doc = make_doc('h1', {'data': '2025-01-01', 'hora': '10:00', 'disponivel': True})

    where_col = MagicMock()
    fake = MagicMock()
    fake.reference = MagicMock()
    fake.reference.update.return_value = None
    where_col.where.return_value.where.return_value.stream.return_value = [fake]

    mock_db.collection.return_value = where_col
    monkeypatch.setattr(fs, 'db', mock_db)

    updated = fs.marcar_horario_reservado('pr1', '2025-01-01', '10:00')
    assert isinstance(updated, int)


def test_listar_clinicas_and_listar_pacientes(monkeypatch):
    mock_db = MagicMock()
    clin_doc = make_doc('c1', {'nome_fantasia': 'Clinica A'})
    pac_doc = make_doc('p1', {'nome': 'Paciente X'})

    def side(name):
        if name == 'clinicas':
            return make_collection_with_docs([clin_doc])
        if name == 'pacientes':
            return make_collection_with_docs([pac_doc])
        return make_collection_with_docs([])

    mock_db.collection.side_effect = side
    monkeypatch.setattr(fs, 'db', mock_db)

    clinicas = fs.listar_clinicas()
    pacientes = fs.listar_pacientes()

    assert clinicas[0]['nome_fantasia'] == 'Clinica A'
    assert pacientes[0]['nome'] == 'Paciente X'


def test_obter_paciente_and_obter_clinica(monkeypatch):
    mock_db = MagicMock()

    pdoc = MagicMock()
    pdoc.exists = True
    pdoc.id = 'p1'
    pdoc.to_dict.return_value = {'nome': 'Paciente X'}
    pref = MagicMock()
    pref.get.return_value = pdoc

    cdoc = MagicMock()
    cdoc.exists = True
    cdoc.id = 'c1'
    cdoc.to_dict.return_value = {'nome_fantasia': 'Clinica A'}
    cref = MagicMock()
    cref.get.return_value = cdoc

    def side(name):
        col = MagicMock()
        if name == 'pacientes':
            col.document.return_value = pref
        if name == 'clinicas':
            col.document.return_value = cref
        return col

    mock_db.collection.side_effect = side
    monkeypatch.setattr(fs, 'db', mock_db)

    p = fs.obter_paciente.__wrapped__('p1')
    c = fs.obter_clinica.__wrapped__('c1')
    assert p['nome'] == 'Paciente X'
    assert c['nome_fantasia'] == 'Clinica A'


def test_criar_consulta_autonomo_and_obter_consulta(monkeypatch):
    mock_db = MagicMock()

    doc_ref = MagicMock()
    doc_ref.id = 'cons123'
    auto_col = MagicMock()
    auto_col.document.return_value = doc_ref

    consulta_doc = MagicMock()
    consulta_doc.exists = True
    consulta_doc.id = 'cons123'
    consulta_doc.to_dict.return_value = {
        'id_paciente': 'p1',
        'nm_paciente': 'Paciente X',
        'id_profissional': 'pr1',
        'nm_profissional': 'Dr Teste',
        'data_consulta': '2025-01-01 10:00',
        'nm_clinica': 'Clinica A'
    }

    clin_col = MagicMock()
    clin_col.document.return_value.get.return_value = consulta_doc

    def side(name):
        if name == 'consultas_autonomos':
            return auto_col
        if name == 'consultas_clinicas':
            return clin_col
        if name == 'consultas':
            no = MagicMock()
            no.exists = False
            top = MagicMock()
            top.document.return_value.get.return_value = no
            return top
        return MagicMock()

    mock_db.collection.side_effect = side
    monkeypatch.setattr(fs, 'db', mock_db)

    cid = fs.criar_consulta_autonomo({'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': '2025-01-01', 'hora': '10:00'})
    assert cid == 'cons123'

    out = fs.obter_consulta('cons123')
    assert out['origem'] in ('consultas_autonomos', 'consultas_clinicas')


def test_listar_profissionais_and_obter_profissional(monkeypatch):
    mock_db = MagicMock()
    prof_doc = make_doc('pr1', {'nome': 'Dr X', 'especialidade': 'Geral'})

    prof_doc_get = MagicMock()
    prof_doc_get.exists = True
    prof_doc_get.id = 'pr1'
    prof_doc_get.to_dict.return_value = {'nome': 'Dr X', 'especialidade': 'Geral'}

    prof_ref = MagicMock()
    prof_ref.get.return_value = prof_doc_get

    def side(name):
        if name == 'profissionais':
            col = make_collection_with_docs([prof_doc])
            col.document.return_value = prof_ref
            return col
        return make_collection_with_docs([])

    mock_db.collection.side_effect = side
    monkeypatch.setattr(fs, 'db', mock_db)

    profs = fs.listar_profissionais.__wrapped__()
    p = fs.obter_profissional.__wrapped__('pr1')

    assert profs[0]['nome'] == 'Dr X'
    assert p['nome'] == 'Dr X'


def test_horarios_mark_and_list(monkeypatch):
    mock_db = MagicMock()

    fake_doc = MagicMock()
    fake_doc.reference = MagicMock()
    fake_doc.reference.update.return_value = None

    where_col = MagicMock()
    where_col.where.return_value.where.return_value.stream.return_value = [fake_doc]

    mock_db.collection.return_value = where_col
    monkeypatch.setattr(fs, 'db', mock_db)

    updated = fs.marcar_horario_reservado('pr1', '2025-01-01', '10:00')
    assert isinstance(updated, int)
