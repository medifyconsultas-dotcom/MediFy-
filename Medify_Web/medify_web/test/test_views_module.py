from types import SimpleNamespace
from django.test import RequestFactory
import pytest

import medify_web.views as views


@pytest.fixture(autouse=True)
def fix_render_redirect(monkeypatch):
    # Replace render and redirect to simple objects we can inspect
    def fake_render(request, template, ctx=None):
        return SimpleNamespace(status_code=200, template=template, context=ctx or {})

    def fake_redirect(name, **kwargs):
        return SimpleNamespace(status_code=302, url=name, kwargs=kwargs)

    monkeypatch.setattr(views, 'render', fake_render)
    monkeypatch.setattr(views, 'redirect', fake_redirect)
    # silence django messages during tests
    try:
        import django.contrib.messages as djmsg
        monkeypatch.setattr(djmsg, 'error', lambda req, m: None)
        monkeypatch.setattr(djmsg, 'success', lambda req, m: None)
    except Exception:
        pass
    yield


def test_visualizar_prontuario_no_auth():
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {}
    res = views.visualizar_prontuario(req, 'x')
    assert hasattr(res, 'status_code') and res.status_code == 302


def test_visualizar_prontuario_not_found(monkeypatch):
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {'localId': 'u1'}
    monkeypatch.setattr(views, 'obter_prontuario', lambda pid: None)
    res = views.visualizar_prontuario(req, 'p1')
    assert res.status_code == 302 and res.url == 'medify_web:dashboard_profissional'


def test_visualizar_prontuario_found(monkeypatch):
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {'uid': 'u1'}
    monkeypatch.setattr(views, 'obter_prontuario', lambda pid: {'id': pid})
    res = views.visualizar_prontuario(req, 'p1')
    assert res.status_code == 200 and 'prontuario' in res.context


def test_editar_prontuario_post_success(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/', data={'titulo': 't'})
    req.session = {'localId': 'u1'}
    monkeypatch.setattr(views, 'obter_prontuario', lambda pid: {'id': pid})
    monkeypatch.setattr(views, 'atualizar_prontuario', lambda pid, dados: True)
    res = views.editar_prontuario(req, 'p1')
    assert res.status_code == 302


def test_excluir_prontuario_post(monkeypatch):
    rf = RequestFactory()
    req = rf.post('/')
    req.session = {'localId': 'u1'}
    # patch the firebase excluir function
    monkeypatch.setattr('medify_web.views.excluir_prontuario_firebase', lambda pid: True, raising=False)
    # call
    res = views.excluir_prontuario(req, 'p1')
    assert res.status_code == 302


def test_criar_prontuario_redirect_on_no_auth():
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {}
    res = views.criar_prontuario(req)
    assert res.status_code == 302


def test_criar_prontuario_post_creates(monkeypatch):
    rf = RequestFactory()
    data = {'paciente_uid': 'pid', 'titulo': 't'}
    req = rf.post('/', data=data)
    req.session = {'localId': 'u1'}
    # patch adicionar_prontuario to be successful
    # patch the firebase_service functions that `criar_prontuario` imports at runtime
    monkeypatch.setattr('medify_web.firebase_services.adicionar_prontuario', lambda pid, pront: True, raising=False)
    # patches for listar_consultas_profissional used earlier (imported inside function)
    monkeypatch.setattr('medify_web.firebase_services.listar_consultas_profissional', lambda uid: [], raising=False)
    res = views.criar_prontuario(req)
    assert res.status_code == 302


def test_verAgenda_debug(monkeypatch):
    rf = RequestFactory()
    req = rf.get('/?debug=1')
    req.session = {'localId': 'u1'}
    monkeypatch.setattr('medify_web.views.obter_paciente', lambda uid: {'nome': 'X'}, raising=False)
    monkeypatch.setattr('medify_web.views.listar_consultas_completas_paciente', lambda **kw: [{'id': 'c1'}], raising=False)
    res = views.verAgenda(req)
    assert res.status_code == 200 and 'debug_consulta_counts' in res.context


def test_index():
    rf = RequestFactory()
    req = rf.get('/')
    req.session = {}
    res = views.index(req)
    assert res.status_code == 200
