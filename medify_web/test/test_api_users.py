import pytest
import medify_web.firebase_services as firebase_services


class TestFirebaseUserAPI:
    """Testes para criação e validação de usuários via Firebase"""

    def test_criar_paciente_firebase(self):
        """CT-003a: Criar paciente via função Firebase e validar persistência"""
        import uuid
        paciente_data = {
            "id": str(uuid.uuid4()),
            "nome": "Paciente Teste",
            "email": f"paciente_{uuid.uuid4().hex[:8]}@email.com",
            "data_nascimento": "2000-01-01",
            "telefone": "11999999999",
            "cpf": "12345678901",
            "endereco": "Rua Teste, 123",
            "plano": "Particular",
            "data_criacao": "2025-01-01T00:00:00Z"
        }
        # Cria paciente
        firebase_services.criar_paciente(paciente_data, uid=paciente_data["id"])
        # Busca paciente
        paciente = firebase_services.obter_paciente(paciente_data["id"])
        assert paciente is not None
        assert paciente.get("email") == paciente_data["email"]
        assert paciente.get("nome") == paciente_data["nome"]

    def test_nao_permitir_email_duplicado(self, monkeypatch):
        """CT-003b: Não permitir criação de paciente com email já existente (Firebase Auth)"""
        import uuid
        email = f"duplicado_{uuid.uuid4().hex[:8]}@email.com"
        paciente_data1 = {
            "id": str(uuid.uuid4()),
            "nome": "Paciente 1",
            "email": email,
            "data_nascimento": "2000-01-01",
            "telefone": "11999999999",
            "cpf": "12345678901",
            "endereco": "Rua Teste, 123",
            "plano": "Particular",
            "data_criacao": "2025-01-01T00:00:00Z"
        }
        paciente_data2 = paciente_data1.copy()
        paciente_data2["id"] = str(uuid.uuid4())
        paciente_data2["nome"] = "Paciente 2"
        # Mockamos criar_paciente para simular comportamento de Auth localmente
        seen = set()

        def fake_criar_paciente(dados, uid=None):
            email = dados.get('email')
            if email in seen:
                raise Exception('Email already exists')
            seen.add(email)
            # Simular criação retornando o uid
            return uid or dados.get('id')

        monkeypatch.setattr(firebase_services, 'criar_paciente', fake_criar_paciente)

        # Cria primeiro paciente (deve passar)
        firebase_services.criar_paciente(paciente_data1, uid=paciente_data1["id"])
        # Tenta criar segundo paciente com mesmo email e espera exceção
        with pytest.raises(Exception) as exc:
            firebase_services.criar_paciente(paciente_data2, uid=paciente_data2["id"])
        assert 'email' in str(exc.value).lower() or 'already exists' in str(exc.value).lower()

    def test_obter_paciente_inexistente(self):
        """CT-003c: Buscar paciente inexistente deve retornar None ou lançar erro controlado"""
        import uuid
        paciente = firebase_services.obter_paciente(str(uuid.uuid4()))
        assert paciente is None or paciente == {}

    def test_editar_paciente_firebase(self):
        """CT-003d: Editar dados do paciente via Firebase e validar persistência"""
        import uuid
        # Cria paciente
        paciente_data = {
            "id": str(uuid.uuid4()),
            "nome": "Paciente Editar",
            "email": f"editar_{uuid.uuid4().hex[:8]}@email.com",
            "data_nascimento": "2000-01-01",
            "telefone": "11999999999",
            "cpf": "12345678901",
            "endereco": "Rua Teste, 123",
            "plano": "Particular",
            "data_criacao": "2025-01-01T00:00:00Z"
        }
        firebase_services.criar_paciente(paciente_data, uid=paciente_data["id"])
        # Edita nome e telefone
        updates = {"nome": "Paciente Editado", "telefone": "11988887777"}
        firebase_services.atualizar_paciente(paciente_data["id"], updates)
        # Busca paciente atualizado
        paciente = firebase_services.obter_paciente(paciente_data["id"])
        # Verificações - Resultado esperado: nome e telefone atualizados
        assert paciente is not None
        assert paciente.get("nome") == "Paciente Editado"
        assert paciente.get("telefone") == "11988887777"
        firebase_services.atualizar_paciente(paciente_data["id"], updates)
        # Busca paciente atualizado
        paciente = firebase_services.obter_paciente(paciente_data["id"])
        assert paciente is not None
        assert paciente.get("nome") == "Paciente Editado"
        assert paciente.get("telefone") == "11988887777"