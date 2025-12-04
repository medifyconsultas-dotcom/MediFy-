import json
import pytest
from django.urls import reverse

import medify_web.firebase_services as fs


def test_dashboard_paciente_requires_auth(client):
    url = reverse('medify_web:dashboard_paciente')
    resp = client.get(url)
    # Should redirect to auth when not authenticated
    assert resp.status_code in (302, 301)


@pytest.mark.django_db
def test_dashboard_paciente_renders_with_data(client, monkeypatch):
    # Prepare session with localId
    session = client.session
    session['localId'] = 'user_1'
    session.save()

    # Monkeypatch firebase service functions
    monkeypatch.setattr(fs, 'obter_paciente', lambda uid: {'nome': 'Paciente Teste', 'email': 'p@example.com'})
    monkeypatch.setattr(fs, 'listar_profissionais', lambda: [{'nome': 'Dr A', 'especialidade': 'Geral'}])
    monkeypatch.setattr(fs, 'listar_medicos_clinicas', lambda: [{'nome': 'Dr B', 'especialidade': 'Cardio'}])
    monkeypatch.setattr(fs, 'listar_clinicas', lambda: [{'nome_fantasia': 'Clinica X'}])
    monkeypatch.setattr(fs, 'listar_consultas_completas_paciente', lambda paciente_uid, paciente_email, paciente_nome: [])

    url = reverse('medify_web:dashboard_paciente')
    resp = client.get(url)
    assert resp.status_code == 200
    # context should contain paciente and medicos lists
    assert 'paciente' in resp.context
    assert resp.context['paciente']['nome'] == 'Paciente Teste'


@pytest.mark.django_db
def test_upload_profile_photo_json_payload(client, monkeypatch):
    session = client.session
    session['localId'] = 'user_1'
    session.save()

    # Monkeypatch atualizar_paciente to simulate DB update
    monkeypatch.setattr(fs, 'atualizar_paciente', lambda uid, updates: True)

    url = reverse('medify_web:upload_profile_photo')
    payload = {'image_url': '/media/pacientes/user_1_123.jpg'}
    resp = client.post(url, data=json.dumps(payload), content_type='application/json')
    assert resp.status_code == 200
    data = json.loads(resp.content.decode('utf-8'))
    assert data.get('ok') is True
    assert data.get('url') == '/media/pacientes/user_1_123.jpg'
