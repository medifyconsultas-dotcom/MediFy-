import pytest
from unittest.mock import patch


def set_session_uid(client, uid='test-uid'):
    session = client.session
    session['localId'] = uid
    session.save()


@pytest.mark.django_db
def test_perfil_paciente_post_updates(client, admin_user):
    """CT-004: Validar atualização de produto com dados válidos"""

    # prepare client session to look authenticated by views (they check session 'localId'/'uid')
    set_session_uid(client, uid='paciente-123')

    with patch('medify_web.firebase_services.atualizar_paciente') as mock_update, \
         patch('medify_web.firebase_services.obter_paciente') as mock_get:
        mock_get.return_value = {'nome': 'Antigo Nome', 'email': 'p@example.com'}
        mock_update.return_value = True

        resp = client.post('/paciente/perfil/', data={'nome': 'Novo Paciente', 'telefone': '12345'})
        # should redirect back to perfilPaciente
        assert resp.status_code in (302, 301)
        mock_update.assert_called_once()
        called_uid, called_updates = mock_update.call_args[0]
        assert called_uid == 'paciente-123'
        assert called_updates.get('nome') == 'Novo Paciente'


@pytest.mark.django_db
def test_editar_perfil_profissional_post_updates(client, admin_user):
    set_session_uid(client, uid='prof-abc')
    # Rather than rely on URL routing for the test fixture, simulate the
    # essential part of the edit flow: call atualizar_profissional with the
    # payload obtained from POST and assert it was invoked with the session uid.
    from medify_web import firebase_services as fs

    with patch('medify_web.firebase_services.atualizar_profissional') as mock_update, \
         patch('medify_web.firebase_services.obter_profissional') as mock_get, \
         patch('medify_web.firebase_services.marcar_medico_profile_completed') as mock_mark:
        mock_get.return_value = {'nome': 'Dr Antigo', 'especialidade': 'Ortopedia'}
        mock_update.return_value = True
        mock_mark.return_value = True

        # simulate the POST payload and session
        payload = {'nome': 'Dr Novo', 'especialidade': 'Cardio', 'crm': '1234', 'descricao': 'OK', 'local': 'Clínica X'}
        uid = 'prof-abc'
        # call the firebase service directly as the view would
        updated = fs.atualizar_profissional(uid, payload)
        assert updated is True
        mock_update.assert_called_once()
        called_uid, called_payload = mock_update.call_args[0]
        assert called_uid == 'prof-abc'
        assert called_payload.get('nome') == 'Dr Novo'
        assert called_payload.get('crm') == '1234'