import types
import medify_web.firebase_services as fs


def test_atualizar_profissional_and_clinica_fallback_to_set(monkeypatch):
    # Ref that fails on update and records set called
    class FailUpdateRef:
        def __init__(self):
            self.set_called = False

        def update(self, payload):
            raise Exception('forced')

        def set(self, payload, merge=False):
            self.set_called = True
            return True

    class Coll:
        def __init__(self, ref):
            self._ref = ref

        def document(self, pid=None):
            return self._ref

    fail_ref1 = FailUpdateRef()
    fail_ref2 = FailUpdateRef()
    class DB:
        def collection(self, name):
            if name == 'profissionais':
                return Coll(fail_ref1)
            if name == 'clinicas':
                return Coll(fail_ref2)
            return Coll(types.SimpleNamespace())

    monkeypatch.setattr(fs, 'db', DB())
    assert fs.atualizar_profissional('x', {'a': 1}) is True
    assert fail_ref1.set_called is True
    assert fs.atualizar_clinica('y', {'b': 2}) is True
    assert fail_ref2.set_called is True


def test_deletar_consulta_completa_triggers_subcollection_and_markers(monkeypatch):
    removed = {'top': False, 'clinic': False, 'auton': False, 'called_remover': False, 'liberou': False}

    class DocRef:
        def __init__(self, exists=True):
            self._exists = exists

        def get(self):
            return types.SimpleNamespace(exists=self._exists, to_dict=lambda: {})

        def delete(self):
            # mark deletion
            removed['clinic'] = True
            return True

    class TopRef:
        def delete(self):
            removed['top'] = True
            return True

    class Coll:
        def __init__(self, obj):
            self._obj = obj

        def document(self, pid=None):
            return self._obj

    class DB:
        def collection(self, name):
            if name == 'consultas':
                return Coll(TopRef())
            if name == 'consultas_clinicas':
                return Coll(DocRef(True))
            if name == 'consultas_autonomos':
                return Coll(DocRef(False))
            return Coll(types.SimpleNamespace())

    def fake_obter(consulta_id):
        return {'paciente_uid': 'pa', 'profissional_uid': 'pr', 'data': '2022-01-01', 'hora': '07:00'}

    def fake_remover(*args, **kwargs):
        removed['called_remover'] = True
        return 1

    def fake_marcar(*args, **kwargs):
        removed['liberou'] = True
        return 1

    monkeypatch.setattr(fs, 'db', DB())
    monkeypatch.setattr(fs, 'obter_consulta', fake_obter)
    monkeypatch.setattr(fs, 'remover_consultas_por_chave', fake_remover)
    monkeypatch.setattr(fs, 'marcar_horario_disponivel', fake_marcar)

    res = fs.deletar_consulta_completa('someid')
    assert res is True
    assert removed['top'] is True
    assert removed['clinic'] is True
    assert removed['called_remover'] is True
    assert removed['liberou'] is True


def test_obter_consulta_parses_data_consulta_and_normalizes(monkeypatch):
    consulta_id = 'cid'

    class DocRef:
        def get(self):
            return types.SimpleNamespace(exists=True, to_dict=lambda: {'data_consulta': '2023-12-01 10:30', 'id_paciente': 'p1', 'nm_paciente': 'P1'})

    class Coll:
        def document(self, pid=None):
            return DocRef()

    class DB:
        def collection(self, name):
            if name == 'consultas':
                class N:
                    def document(self, pid=None):
                        return types.SimpleNamespace(get=lambda: types.SimpleNamespace(exists=False))
                return N()
            if name in ('consultas_clinicas', 'consultas_autonomos'):
                return Coll()
            return Coll()

    monkeypatch.setattr(fs, 'db', DB())
    out = fs.obter_consulta(consulta_id)
    assert out is not None
    assert out.get('data') == '2023-12-01'
    assert out.get('hora') == '10:30'
