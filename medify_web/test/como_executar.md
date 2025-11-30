# Executar todos os testes
pytest

# Executar testes específicos por marca
pytest -m "auth"
pytest -m "api"

# Executar teste específico
pytest tests/test_authentication.py::TestAuthentication::test_login_credenciais_validas

# Com cobertura
pytest --cov

# Gerar relatório HTML
pytest --cov-report=html

ash
# Teste primeiro a configuração básica
pytest medify_web/test/test_config.py -v

# Execute testes específicos
pytest medify_web/test/test_authentication.py -v

# Execute todos os testes
pytest medify_web/test/ -v

# Com informações detalhadas
pytest medify_web/test/ -v --tb=long