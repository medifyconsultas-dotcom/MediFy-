import datetime
import types
import medify_web.firebase_services as fs


class FakeRef:
    def __init__(self, exists=True, fail_update=False):
        self._exists = exists
        self.fail_update = fail_update
        self.updated = False
        self.set_called = False
        self.deleted = False

    def get(self):
        return types.SimpleNamespace(exists=self._exists)

    def update(self, payload):
        self.updated = True
        if self.fail_update:
            raise Exception('forced update error')
        return True

    def set(self, payload, merge=False):
        self.set_called = True
        return True

    def delete(self):
        self.deleted = True
        return True


class FakeDocumentRef:
    def __init__(self, doc=None):
        self.doc = doc

    def collection(self, name):
        if self.doc and hasattr(self.doc, 'subcollections'):
            return self.doc.subcollections.get(name, FakeColl([]))
        return FakeColl([])
    
    def set(self, payload, merge=False):
        if self.doc:
            if merge:
                try:
                    self.doc._data.update(payload)
                except Exception:
                    self.doc._data = dict(payload)
            else:
                self.doc._data = dict(payload)
            if hasattr(self.doc, 'reference'):
                self.doc.reference.set(payload, merge=merge)
            return True
        # creating a new doc - simulate success
        return True

    def update(self, payload):
        if self.doc and hasattr(self.doc, 'reference'):
            return self.doc.reference.update(payload)
        # simulate update on non-existing -> raise like Firestore
        raise Exception('No document to update')

    def delete(self):
        if self.doc and hasattr(self.doc, 'reference'):
            return self.doc.reference.delete()
        return True

    def get(self):
        if self.doc:
            return types.SimpleNamespace(exists=True, to_dict=lambda: dict(self.doc._data))
        return types.SimpleNamespace(exists=False, to_dict=lambda: None)


class FakeDoc:
    def __init__(self, id_, data, ref=None):
        self.id = id_
        self._data = data
        self.reference = ref or FakeRef()

    def to_dict(self):
        return dict(self._data)


class FakeColl:
    def __init__(self, docs=None):
        self._docs = docs or []

    def stream(self):
        return list(self._docs)

    def where(self, *args, **kwargs):
        # return all docs for simplicity; higher-level tests filter by content
        return self

    def limit(self, n):
        return self

    def document(self, pid):
        for d in self._docs:
            if getattr(d, 'id', None) == pid:
                # Return a Document-like reference that supports .collection()
                return FakeDocumentRef(d)
        # default: return a Document-like ref that does not exist
        return FakeDocumentRef(None)

    def add(self, dados):
        # simulate adding by returning a tuple (ref, id)
        ref = FakeRef()
        return (ref, 'newid')

    def delete_doc_by_id(self, pid):
        # helper not used
        pass


class FakeDB:
    def __init__(self, mapping):
        self._mapping = mapping

    def collection(self, name):
        return self._mapping.get(name, FakeColl([]))


def test_big_integration_exercises_many_paths(monkeypatch):
    now = datetime.datetime.now()
    past = (now - datetime.timedelta(days=5)).strftime('%Y-%m-%d %H:%M')

    # prepare various docs
    func_med = FakeDoc('f1', {'cargo': 'Medico', 'nome': 'Dr A', 'especialidade': 'Geral', 'idClinica': 'cl1'})
    func_other = FakeDoc('f2', {'cargo': 'Recepcao', 'nome': 'Ana'})

    clinica = FakeDoc('cl1', {'medicos': [{'uid': 'f1', 'nome': 'Dr A', 'crm': '123'}], 'recepcionistas': [{'uid': 'r1'}]})

    paciente = FakeDoc('p1', {'nome': 'Paciente X'})
    profissional = FakeDoc('pr1', {'nome': 'Prof Y'})

    # consultas: one top-level agendada, one clinical, one autonomo with past dates
    top_ref = FakeRef(exists=True, fail_update=True)
    top_doc = FakeDoc('top1', {'data_consulta': past, 'status': 'Agendada', 'id_paciente': 'p1', 'id_profissional': 'pr1'}, ref=top_ref)

    clinic_ref = FakeRef(exists=True, fail_update=True)
    clinic_doc = FakeDoc('cc1', {'data_consulta': past, 'status': 'Agendada', 'id_paciente': 'p2', 'id_profissional': 'pr2'}, ref=clinic_ref)

    auto_ref = FakeRef(exists=True, fail_update=True)
    auto_doc = FakeDoc('ca1', {'data': (now - datetime.timedelta(days=10)).strftime('%Y-%m-%d %H:%M'), 'status': 'Agendada', 'id_paciente': 'p3', 'id_profissional': 'pr3'}, ref=auto_ref)

    # subcollection docs
    psub = FakeDoc('ps1', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'profissional_uid': 'pr1'}, ref=FakeRef(fail_update=True))
    prsub = FakeDoc('prs1', {'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'paciente_uid': 'p1'}, ref=FakeRef(fail_update=True))

    fake = FakeDB({
        'funcionarios': FakeColl([func_med, func_other]),
        'clinicas': FakeColl([clinica]),
        'pacientes': FakeColl([paciente]),
        'profissionais': FakeColl([profissional]),
        'consultas': FakeColl([top_doc]),
        'consultas_clinicas': FakeColl([clinic_doc]),
        'consultas_autonomos': FakeColl([auto_doc]),
    })

    # patch db
    monkeypatch.setattr(fs, 'db', fake)

    # Call many functions
    mlist = fs.listar_medicos_clinicas.__wrapped__()
    assert isinstance(mlist, list)

    assert fs.is_medico_profile_complete('f1') is True
    fs.marcar_medico_profile_completed('f1')

    # pacientes/profissionais
    fs.criar_paciente({'nome': 'X'}, uid='p_new')
    _ = fs.listar_pacientes()
    _ = fs.obter_paciente('p1')
    fs.atualizar_paciente('p1', {'x': 1})

    fs.criar_profissional({'nome': 'Z'}, uid='pr_new')
    _ = fs.listar_profissionais.__wrapped__()
    _ = fs.obter_profissional('pr1')
    fs.atualizar_profissional('pr1', {'y': 2})

    fs.criar_clinica({'nome': 'C1'})
    _ = fs.listar_clinicas()
    fs.criar_funcionario('cl1', {'nome': 'F3'})

    _ = fs.obter_clinica('cl1')
    _ = fs.obter_clinica_por_recepcionista('r1')

    # horarios
    fs.adicionar_horario_profissional('pr1', '2020-01-01', '09:00')
    _ = fs.listar_horarios_profissional('pr1')
    fs.marcar_horario_reservado('pr1', past.split(' ')[0], past.split(' ')[1])
    fs.marcar_horario_disponivel('pr1', past.split(' ')[0], past.split(' ')[1])
    fs.deletar_horario_profissional('pr1', 'h1')

    # consultas
    cid1 = fs.criar_consulta_clinica({'paciente_uid': 'p1', 'profissional_uid': 'pr1', 'data': past.split(' ')[0], 'hora': past.split(' ')[1], 'clinica_uid': 'cl1', 'clinica_nome': 'C1', 'paciente_nome': 'P1', 'profissional_nome': 'PR1'})
    cid2 = fs.criar_consulta_autonomo({'paciente_uid': 'p2', 'profissional_uid': 'pr2', 'data': past.split(' ')[0], 'hora': past.split(' ')[1]})
    _ = fs.obter_consulta('top1')
    fs.deletar_consulta('top1')
    fs.deletar_consulta_completa('top1')
    fs.marcar_consulta_cancelada('top1', motivo='teste', liberar_horario=True)
    fs.atualizar_consulta('top1', {'status': 'x'})

    # finalizar consultas passadas should touch multiple collections
    changed = fs.finalizar_consultas_passadas()
    assert isinstance(changed, int)

    # remover por chave
    removed = fs.remover_consultas_por_chave(paciente_uid='p1', profissional_uid='pr1', data_str=past.split(' ')[0], hora_str=past.split(' ')[1])
    assert isinstance(removed, int)
