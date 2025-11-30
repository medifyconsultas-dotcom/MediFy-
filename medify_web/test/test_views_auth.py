from types import SimpleNamespace
from django.test import RequestFactory
import pytest

import medify_web.views_auth as va


@pytest.fixture(autouse=True)
def patch_render_redirect_messages(monkeypatch):
    from django.http import HttpResponse, HttpResponseRedirect

    def fake_render(request, template, ctx=None):
        # include context in body so tests can assert on error messages
        body = ''
        if ctx:
            # common keys used in templates
            body = str(ctx.get('erro') or ctx.get('error') or ctx.get('mensagem') or ctx.get('errors') or ctx)
        if not body:
            body = 'OK'
        resp = HttpResponse(body, status=200)
        resp.template = template
        resp.context = ctx or {}
        return resp

    def fake_redirect(name, **kwargs):
        return HttpResponseRedirect('/')

    monkeypatch.setattr(va, 'render', fake_render)
    monkeypatch.setattr(va, 'redirect', fake_redirect)
    try:
        import django.contrib.messages as djmsg
        monkeypatch.setattr(djmsg, 'error', lambda req, m: None)
        monkeypatch.setattr(djmsg, 'success', lambda req, m: None)
        monkeypatch.setattr(djmsg, 'warning', lambda req, m: None)
    except Exception:
        pass
    yield


def test_esqueci_senha_post_sends(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/', data={'email': 'u@x'})
    req.session = {}
    monkeypatch.setattr('medify_web.firebase_services.enviar_email_redefinicao', lambda email: {'email': email})
    res = va.esqueci_senha_view(req)
    assert res.status_code == 302


def test_alterar_senha_redirects_when_no_token():
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {}
    res = va.alterar_senha_view(req)
    assert res.status_code == 302


def test_cadastrar_with_invalid_password(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/', data={'email': 'a@b', 'password': 'weak'})
    req.session = {}
    # force validation to fail
    monkeypatch.setattr('medify_web.password_utils.validate_password', lambda p: (False, 'bad'), raising=False)
    res = va.cadastrar_view(req)
    assert res.status_code == 200 and 'Auth' in res.template


def test_logout_redirects():
    rf = RequestFactory()
    req = rf.post('/')
    req.session = {'localId': 'x'}
    res = va.logout_view(req)
    assert res.status_code == 302
import pytest
from unittest.mock import patch
from django.test import Client


class DummyResp:
    def __init__(self, status_code=200, json_data=None, text=''):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text

    def json(self):
        return self._json


@pytest.mark.django_db
def test_auth_view_login_success_patient(client):
    c = client
    # prepare fake signIn response and patient GET
    signin_data = {'idToken': 'idtok', 'localId': 'uid-p', 'email': 'p@example.com'}

    def fake_post(url, json=None, timeout=None):
        # signInWithPassword
        return DummyResp(200, signin_data)

    def fake_get(url, headers=None, timeout=None):
        # if hits pacientes/{uid} return 200
        if f"/pacientes/{signin_data['localId']}" in url:
            return DummyResp(200, {'fields': {}})
        return DummyResp(404, {})

    with patch('medify_web.views_auth._session.post', side_effect=fake_post) as p_post, \
         patch('medify_web.views_auth._session.get', side_effect=fake_get) as p_get:
        resp = c.post('/auth/', data={'email': 'p@example.com', 'senha': '12345'})
        assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_auth_view_login_invalid_credentials(client):
    c = client

    def fake_post_fail(url, json=None, timeout=None):
        return DummyResp(400, {'error': {'message': 'INVALID_PASSWORD'}})

    with patch('medify_web.views_auth._session.post', side_effect=fake_post_fail):
        resp = c.post('/auth/', data={'email': 'x@example.com', 'senha': 'bad'})
        # should render the auth page with error
        assert resp.status_code == 200
        content = resp.content.decode('utf-8')
        assert 'Credenciais inválidas' in content or 'Perfil não encontrado' in content or 'erro' in content.lower()


@pytest.mark.django_db
def test_cadastrar_view_creates_paciente_and_profissional(client):
    c = client

    # fake signUp response
    signup_resp = {'localId': 'new-uid', 'idToken': 'token'}

    with patch('medify_web.views_auth.requests.post') as sess_post, \
         patch('medify_web.firebase_services.criar_paciente') as criar_pac, \
         patch('medify_web.firebase_services.criar_profissional') as criar_prof:
        sess_post.return_value = DummyResp(200, signup_resp)
        # Test paciente
        resp_p = c.post('/cadastrar/', data={'perfil': 'paciente', 'nome': 'Test', 'email': 't@x', 'senha': 'Senha123!'})
        assert resp_p.status_code in (200, 302)
        criar_pac.assert_called()

        # Test profissional
        resp_pr = c.post('/cadastrar/', data={'perfil': 'profissional', 'nome': 'Dr Test', 'email': 'd@x', 'senha': 'Senha123!'})
        assert resp_pr.status_code in (200, 302)
        criar_prof.assert_called()


@pytest.mark.django_db
def test_esqueci_senha_post_success_and_failure(client):
    c = client
    # success case
    with patch('medify_web.firebase_services.enviar_email_redefinicao') as enviar:
        enviar.return_value = {'email': 'ok@example.com'}
        resp = c.post('/auth/esqueci/', data={'email': 'ok@example.com'})
        assert resp.status_code in (301, 302)

    # failure case -> service returns error
    with patch('medify_web.firebase_services.enviar_email_redefinicao') as enviar2:
        enviar2.return_value = {'error': {'message': 'SOME_ERROR'}}
        resp2 = c.post('/auth/esqueci/', data={'email': 'bad@example.com'})
        assert resp2.status_code in (301, 302)


@pytest.mark.django_db
def test_alterar_senha_view_success(client):
    c = client
    # prepare session with idToken
    s = c.session
    s['idToken'] = 'oldtoken'
    s.save()

    with patch('medify_web.firebase_services.alterar_senha_com_token') as alterar:
        alterar.return_value = {'idToken': 'newtoken'}
        resp = c.post('/auth/alterar_senha/', data={'nova_senha': 'Senha123!', 'confirma_senha': 'Senha123!'})
        # redirect back to perfilPaciente
        assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_auth_view_detects_medico_via_clinicas_and_redirects(client):
    c = client
    signin_data = {'idToken': 'idtok', 'localId': 'uid-med', 'email': 'm@example.com'}

    def fake_post(url, json=None, timeout=None):
        return DummyResp(200, signin_data)

    def fake_get(url, headers=None, timeout=None):
        # simulate pacientes/profissionais/clinicas/{uid} missing
        if url.endswith(f"/pacientes/{signin_data['localId']}"):
            return DummyResp(404, {})
        if url.endswith(f"/profissionais/{signin_data['localId']}"):
            return DummyResp(404, {})
        if url.endswith(f"/clinicas/{signin_data['localId']}"):
            return DummyResp(404, {})
        # clinicas listing: include a clinic that has this medico uid
        if url.endswith('/clinicas'):
            docs = [{
                'fields': {
                    'medicos': {'arrayValue': {'values': [
                        {'mapValue': {'fields': {'uid': {'stringValue': signin_data['localId']}}}}
                    ]}}
                }
            }]
            return DummyResp(200, {'documents': docs})
        return DummyResp(404, {})

    with patch('medify_web.views_auth._session.post', side_effect=fake_post), \
         patch('medify_web.views_auth._session.get', side_effect=fake_get), \
         patch('medify_web.firebase_services.is_medico_profile_complete', return_value=False):
        resp = c.post('/auth/', data={'email': 'm@example.com', 'senha': 'pw'})
        assert resp.status_code in (301, 302)
