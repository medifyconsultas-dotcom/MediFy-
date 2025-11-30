from types import SimpleNamespace
from django.test import RequestFactory
import json
import pytest

import medify_web.views_consultas as vc


@pytest.fixture(autouse=True)
def patch_render_redirect_messages(monkeypatch):
    from django.http import HttpResponse, HttpResponseRedirect

    def fake_render(request, template, ctx=None):
        resp = HttpResponse('OK', status=200)
        resp.template = template
        resp.context = ctx or {}
        return resp

    def fake_redirect(name, **kwargs):
        # return a real HttpResponseRedirect so middleware can operate on it
        return HttpResponseRedirect('/')

    monkeypatch.setattr(vc, 'render', fake_render)
    monkeypatch.setattr(vc, 'redirect', fake_redirect)
    try:
        import django.contrib.messages as djmsg
        monkeypatch.setattr(djmsg, 'error', lambda req, m: None)
        monkeypatch.setattr(djmsg, 'success', lambda req, m: None)
        monkeypatch.setattr(djmsg, 'warning', lambda req, m: None)
    except Exception:
        pass
    yield


def test_consultaGeral_get_renders(monkeypatch):
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {}
    # stub listar_profissionais and listar_medicos_clinicas in firebase_services
    monkeypatch.setattr('medify_web.firebase_services.listar_profissionais', lambda: [])
    monkeypatch.setattr('medify_web.firebase_services.listar_medicos_clinicas', lambda: [])
    res = vc.consultaGeral(req)
    assert res.status_code == 200 and 'consultaGeral' in res.template


def test_consultaGeral_post_unauth_redirects(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/', data={})
    req.session = {}
    res = vc.consultaGeral(req)
    assert res.status_code == 302


def test_consultaGeral_post_missing_fields(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/', data={'medico': 'm1'})
    req.session = {'localId': 'p1'}
    monkeypatch.setattr('medify_web.firebase_services.listar_profissionais', lambda: [])
    monkeypatch.setattr('medify_web.firebase_services.listar_medicos_clinicas', lambda: [])
    res = vc.consultaGeral(req)
    assert res.status_code == 302


def test_consultaGeral_post_creates_clinic_and_redirects(monkeypatch):
    rf = RequestFactory()
    data = {'medico': 'm1', 'data': '2025-01-01', 'hora': '09:00'}
    req = rf.post('/', data=data)
    req.session = {'localId': 'p1', 'email': 'x@y'}
    # medico in medicos_clinica has clinica_uid so criar_consulta_clinica should be used
    medico = {'uid': 'm1', 'clinica_uid': 'c1', 'nome': 'Dr'}
    monkeypatch.setattr('medify_web.firebase_services.listar_profissionais', lambda: [])
    monkeypatch.setattr('medify_web.firebase_services.listar_medicos_clinicas', lambda: [medico])
    monkeypatch.setattr('medify_web.firebase_services.criar_consulta_clinica', lambda d: 'newid')
    monkeypatch.setattr('medify_web.firebase_services.criar_consulta_autonomo', lambda d: None)
    monkeypatch.setattr('medify_web.firebase_services.adicionar_consulta_a_paciente', lambda pid, dados, consulta_id=None: None, raising=False)
    monkeypatch.setattr('medify_web.firebase_services.adicionar_consulta_a_profissional', lambda pid, dados, consulta_id=None: None, raising=False)
    monkeypatch.setattr('medify_web.firebase_services.marcar_horario_reservado', lambda uid, d, h: 1)
    res = vc.consultaGeral(req)
    assert res.status_code == 302


def test_atualizar_consulta_via_ajax_success(monkeypatch):
    rf = RequestFactory()
    payload = {'id': 'c1', 'data': '2025-01-01', 'hora': '09:00'}
    req = rf.post('/', data={}, content_type='application/json')
    req._body = json.dumps(payload).encode('utf-8')
    req.body = req._body
    req.session = {'localId': 'm1'}
    monkeypatch.setattr('medify_web.firebase_services.obter_consulta', lambda cid: {'id': 'c1', 'profissional_uid': 'm1'})
    monkeypatch.setattr('medify_web.firebase_services.atualizar_consulta', lambda cid, upd: True)
    res = vc.atualizar_consulta_via_ajax(req)
    assert res.status_code == 200


def test_cancelar_consulta_posts(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/')
    req.session = {'localId': 'p1'}
    monkeypatch.setattr('medify_web.firebase_services.obter_consulta', lambda cid: {'id': cid, 'paciente_uid': 'p1'})
    monkeypatch.setattr('medify_web.firebase_services.marcar_consulta_cancelada', lambda cid, motivo=None: True)
    res = vc.cancelar_consulta(req, 'c1')
    assert res.status_code == 302
import json
import pytest

import medify_web.firebase_services as fs


pytestmark = pytest.mark.django_db


def test_agendar_consulta_clinica_creates_and_redirects(client, monkeypatch):
    # setup session as logged-in paciente
    s = client.session
    s['localId'] = 'p1'
    s['email'] = 'p1@example.com'
    s.save()

    # mock medicos lists to include a medico that belongs to a clinica
    monkeypatch.setattr(fs, 'listar_profissionais', lambda: [])
    monkeypatch.setattr(fs, 'listar_medicos_clinicas', lambda: [{'uid': 'm1', 'clinica_uid': 'c1', 'nome': 'Dr Teste', 'especialidade': 'Geral'}])

    monkeypatch.setattr(fs, 'obter_paciente', lambda uid: {'nome': 'Paciente 1'})

    called = {}

    def fake_criar_consulta_clinica(dados):
        called['created'] = True
        return 'newid'

    monkeypatch.setattr(fs, 'criar_consulta_clinica', fake_criar_consulta_clinica)
    monkeypatch.setattr(fs, 'adicionar_consulta_a_paciente', lambda *a, **k: None)
    monkeypatch.setattr(fs, 'adicionar_consulta_a_profissional', lambda *a, **k: None)
    monkeypatch.setattr(fs, 'marcar_horario_reservado', lambda *a, **k: 1)

    resp = client.post('/paciente/agendar/', {'medico': 'm1', 'data': '2025-12-01', 'hora': '09:00'})
    assert resp.status_code == 302
    assert called.get('created', False) is True


def test_remarcar_consulta_deletes_old_and_frees_slot(client, monkeypatch):
    s = client.session
    s['localId'] = 'p1'
    s['email'] = 'p1@example.com'
    s.save()

    # No medicos in lists; will fallback to obter_consulta for old values
    monkeypatch.setattr(fs, 'listar_profissionais', lambda: [])
    monkeypatch.setattr(fs, 'listar_medicos_clinicas', lambda: [])

    # old consulta to be rescheduled
    old = {'profissional_uid': 'pr_old', 'data': '2025-11-01', 'hora': '08:00', 'profissional_nome': 'Dr Old'}
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: old)

    created = {}
    monkeypatch.setattr(fs, 'criar_consulta_autonomo', lambda dados: 'nid')

    called = {'deleted': False, 'freed': False}

    monkeypatch.setattr(fs, 'deletar_consulta_completa', lambda cid: called.update({'deleted': True}) or True)
    monkeypatch.setattr(fs, 'marcar_horario_disponivel', lambda uid, d, h: called.update({'freed': True}) or 1)

    resp = client.post('/paciente/agendar/', {'medico': '', 'data': '2025-12-05', 'hora': '10:00', 'reschedule_from': 'oldid'})
    assert resp.status_code == 302
    assert called['deleted'] is True
    assert called['freed'] is True


def test_atualizar_consulta_via_ajax_success(client, monkeypatch):
    # simulate professional performing update
    s = client.session
    s['localId'] = 'pr1'
    s.save()

    consulta = {'id': 'c1', 'profissional_uid': 'pr1', 'data': '2025-12-01', 'hora': '09:00'}
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: consulta)
    monkeypatch.setattr(fs, 'atualizar_consulta', lambda cid, updates: True)

    payload = json.dumps({'id': 'c1', 'data': '2025-12-02', 'hora': '10:00'})
    # Call the view function directly to avoid depending on test URL injection
    from django.test import RequestFactory
    rf = RequestFactory()
    req = rf.post('/', data=payload, content_type='application/json')
    req._body = payload.encode('utf-8')
    req.session = {'localId': 'pr1'}
    resp = __import__('medify_web.views_consultas').views_consultas.atualizar_consulta_via_ajax(req)
    assert resp.status_code == 200
    data = json.loads(resp.content.decode('utf-8'))
    assert data.get('success') is True


def test_cancelar_consulta_patient_success(client, monkeypatch):
    # Setup session as patient
    s = client.session
    s['localId'] = 'p1'
    s.save()

    # obter_consulta returns a consulta owned by patient
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: {'paciente_uid': 'p1'})
    called = {}
    monkeypatch.setattr(fs, 'marcar_consulta_cancelada', lambda cid, motivo=None: called.update({'ok': True}) or True)

    resp = client.post(f'/paciente/consulta/cancelar/cons1/', {'motivo': 'não posso'})
    assert resp.status_code == 302
    assert called.get('ok', False) is True


def test_deletar_consulta_permanente_by_patient_and_by_other(client, monkeypatch):
    # patient owns the consulta
    s = client.session
    s['localId'] = 'p1'
    s.save()

    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: {'paciente_uid': 'p1', 'profissional_uid': 'pr1'})
    monkeypatch.setattr(fs, 'deletar_consulta_completa', lambda cid: True)

    resp = client.post('/paciente/consulta/deletar/cons1/')
    assert resp.status_code == 302

    # now test non-owner cannot delete
    s2 = client.session
    s2['localId'] = 'other'
    s2.save()
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: {'paciente_uid': 'p1', 'profissional_uid': 'pr1'})

    resp2 = client.post('/paciente/consulta/deletar/cons1/')
    assert resp2.status_code == 302


def test_deletar_todas_consultas_patient(client, monkeypatch):
    s = client.session
    s['localId'] = 'p1'
    s.save()

    # listar_consultas_completas_paciente returns a mix of agendada and concluida
    monkeypatch.setattr(fs, 'listar_consultas_completas_paciente', lambda paciente_uid=None: [
        {'id': 'a1', 'status': 'Concluída'},
        {'id': 'a2', 'status': 'Agendada'},
        {'id': 'a3', 'status': 'Cancelada'}
    ])

    removed = {'count': 0}
    def fake_delete(cid):
        removed['count'] += 1
        return True

    monkeypatch.setattr(fs, 'deletar_consulta_completa', fake_delete)

    resp = client.post('/paciente/consultas/deletar_tudo/')
    assert resp.status_code == 302
    # should have deleted 2 (Concluída and Cancelada)
    assert removed['count'] == 2


def test_cancelar_consulta_not_found_or_session_expired(client, monkeypatch):
    # no session -> redirect to login
    resp = client.post('/paciente/consulta/cancelar/doesnotexist/')
    assert resp.status_code == 302

    # session but consulta not found -> redirect to verAgenda
    s = client.session
    s['localId'] = 'p1'
    s.save()
    monkeypatch.setattr(fs, 'obter_consulta', lambda cid: None)
    resp2 = client.post('/paciente/consulta/cancelar/notfound/')
    assert resp2.status_code == 302


def test_agendar_incomplete_data_redirects(client, monkeypatch):
    # user logged in but incomplete POST data
    s = client.session
    s['localId'] = 'p1'
    s.save()

    monkeypatch.setattr(fs, 'listar_profissionais', lambda: [])
    monkeypatch.setattr(fs, 'listar_medicos_clinicas', lambda: [])

    resp = client.post('/paciente/agendar/', {'medico': '', 'data': '', 'hora': ''})
    # should redirect due to incomplete data
    assert resp.status_code == 302
