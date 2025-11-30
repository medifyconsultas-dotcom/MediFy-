import pytest
from django.conf import settings

def test_django_configurado():
    """Testa se o Django está configurado corretamente"""
    assert settings.configured

@pytest.mark.django_db
def test_banco_dados_funcionando():
    """Testa se o banco de dados está funcionando"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Tenta criar um usuário
    user = User.objects.create_user('testuser', 'test@example.com', 'testpass')
    assert user.pk is not None
    
    # Limpa
    user.delete()

def test_urls_carregadas():
    """Testa se as URLs estão carregadas"""
    from django.urls import get_resolver
    resolver = get_resolver()
    assert resolver is not None