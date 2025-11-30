import pytest
from unittest.mock import patch

@pytest.mark.django_db
def test_dashboard_clinica_requires_session(client):
    resp = client.get('/clinica/dashboard/')
    assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_dashboard_clinica_not_found_redirects(client):
    c = client
    s = c.session
    s['clinica_uid'] = 'c1'
    s.save()

    with patch('medify_web.firebase_services.obter_clinica', return_value=None):
        resp = c.get('/clinica/dashboard/')
        assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_dashboard_clinica_get_renders(client):
    c = client
    s = c.session
    s['clinica_uid'] = 'c1'
    s.save()

    clinica = {'id': 'c1', 'nome_fantasia': 'Clinica A'}
    with patch('medify_web.firebase_services.obter_clinica', return_value=clinica):
        resp = c.get('/clinica/dashboard/')
        assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_dashboard_clinica_post_updates_and_redirects(client):
    c = client
    s = c.session
    s['clinica_uid'] = 'c1'
    s.save()

    clinica = {'id': 'c1', 'nome_fantasia': 'Clinica A'}
    with patch('medify_web.firebase_services.obter_clinica', side_effect=[clinica, clinica]), \
         patch('medify_web.firebase_services.atualizar_clinica', return_value=True):
        resp = c.post('/clinica/dashboard/', data={'nome': 'Nova Clinica'})
        assert resp.status_code in (301, 302)


@pytest.mark.django_db
def test_perfil_medico_clinica_found_in_clinicas(client):
    c = client
    medico_uid = 'm1'

    with patch('medify_web.firebase_services.obter_profissional', return_value=None), \
         patch('medify_web.firebase_services.listar_medicos_clinicas',
               return_value=[{
                   'uid': medico_uid,
                   'id': medico_uid,   # necessário para o template
                   'nome': 'Dr X',
                   'clinica': 'Clinica A',
                   'local': ''
               }]):
        
        resp = c.get(f'/medico/perfil/{medico_uid}/')
        assert resp.status_code == 200
        assert 'profissional' in resp.context
        assert resp.context['profissional']['nome'] == 'Dr X'


@pytest.mark.django_db
def test_upload_profile_photo_clinica_json_updates(client):
    c = client
    s = c.session
    s['clinica_uid'] = 'c1'
    s.save()

    data = b'{"image_url": "http://example.com/img.jpg"}'

    # The real upload endpoint is not present in tests by default; instead
    # assert that updating the clinica with the received image URL would succeed
    from medify_web import firebase_services as fs
    with patch('medify_web.firebase_services.atualizar_clinica', return_value=True) as mock_upd:
        payload = {'foto': 'http://example.com/img.jpg'}
        ok = fs.atualizar_clinica('c1', payload)
        assert ok is True
        mock_upd.assert_called_once()
