import datetime
from firebase_admin import firestore
import time
from functools import wraps

# Inicializa db de forma resiliente - permite que app funcione sem Firebase
try:
    db = firestore.client()
except Exception:
    db = None

def _ensure_db():
    """Helper para garantir que o db está disponível antes de usar"""
    global db
    if db is None:
        try:
            db = firestore.client()
        except Exception:
            pass
    return db

import requests

def enviar_email_redefinicao(email, api_key=None):
    """Envia e-mail de redefinição de senha para o usuário usando a API REST do Firebase Auth."""
    if api_key is None:
        # Use a API_KEY do projeto se não for passada
        api_key = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"  # ajuste se necessário
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}"
    payload = {
        "requestType": "PASSWORD_RESET",
        "email": email
    }
    resp = requests.post(url, json=payload)
    return resp.json()


def alterar_senha_com_token(id_token: str, nova_senha: str, api_key=None):
    """Altera a senha do usuário autenticado dado um idToken (sessão do Firebase).
    Retorna o JSON da resposta do endpoint accounts:update.
    """
    if api_key is None:
        api_key = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={api_key}"
    payload = {
        'idToken': id_token,
        'password': nova_senha,
        'returnSecureToken': True
    }
    try:
        resp = requests.post(url, json=payload)
        return resp.json()
    except Exception as e:
        return {'error': {'message': str(e)}}


# Simple in-process timed cache to reduce Firestore calls in development.
# This is intentionally lightweight (per-process) and suitable for dev
# or low-traffic scenarios. For production, use a shared cache (Redis).
def _timed_cache(ttl=30):
    def decorator(fn):
        cache = {}
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # key is args + sorted kwargs to be stable across calls
            key = (args, tuple(sorted(kwargs.items())))
            now = time.time()
            entry = cache.get(key)
            if entry:
                ts, val = entry
                if now - ts < ttl:
                    return val
            val = fn(*args, **kwargs)
            try:
                cache[key] = (now, val)
            except Exception:
                pass
            return val
        return wrapper
    return decorator

# Lista todos os médicos das clínicas

@_timed_cache(ttl=600)  # OTIMIZAÇÃO: Aumentado de 60s para 600s (10min)
def listar_medicos_clinicas():
    """Carrega apenas os médicos a partir da coleção 'funcionarios' (raiz).
    Filtra apenas documentos onde o campo 'cargo' == 'medico'.
    Cada documento referencia a clínica via campo 'idClinica'.
    Retorna lista de dicts com chaves normalizadas para compatibilidade com o resto do código.
    """
    medicos = []
    try:
        # Query na coleção raiz 'funcionarios'
        docs = db.collection('funcionarios').stream()
        for doc in docs:
            sd = _safe_snapshot_dict(doc)
            if not sd:
                continue
            
            # Filtra APENAS médicos: verifica se cargo == 'medico' (case-insensitive)
            cargo = (sd.get('cargo') or '').lower().strip()
            if cargo != 'medico':
                continue
            
            # Normaliza campos para compatibilidade com o resto do código
            # O Firebase gera 'id' automaticamente; usamos como 'uid'
            sd.setdefault('uid', sd.get('id'))
            sd.setdefault('nome', sd.get('nome', ''))
            sd.setdefault('especialidade', sd.get('especialidade') or 'Geral')
            sd.setdefault('crm', sd.get('crm', ''))
            
            # Referência à clínica vem como 'idClinica' no documento
            sd.setdefault('clinica_uid', sd.get('idClinica'))
            # Se houver informações da clínica armazenadas, preserve
            sd.setdefault('clinica_nome', sd.get('clinica_nome') or sd.get('clinica'))
            
            medicos.append(sd)
        
        return medicos
    except Exception:
        # Em caso de erro genérico, retorna lista vazia ao invés de crashar
        return []


def is_medico_profile_complete(medico_uid: str) -> bool:
    """Checks if a medico stored in any clinic has profile_completed=True or has required fields filled.
    Returns True if profile is considered complete, False otherwise."""
    try:
        docs = db.collection('clinicas').stream()
        for doc in docs:
            data = doc.to_dict()
            medicos = data.get('medicos', [])
            for m in medicos:
                try:
                    if isinstance(m, dict) and str(m.get('uid', '')) == str(medico_uid):
                        # Explicit flag wins
                        if m.get('profile_completed') is True:
                            return True
                        # Fallback: require nome and crm
                        if m.get('nome') and m.get('crm'):
                            return True
                        return False
                except Exception:
                    continue
    except Exception:
        pass
    return False


def marcar_medico_profile_completed(medico_uid: str) -> bool:
    """Find the clinic document that contains a medico entry with given uid and set profile_completed=True for that entry.
    Returns True on success, False otherwise."""
    try:
        docs = db.collection('clinicas').stream()
        for doc in docs:
            data = doc.to_dict()
            medicos = data.get('medicos', [])
            updated = False
            for i, m in enumerate(medicos):
                try:
                    if isinstance(m, dict) and str(m.get('uid', '')) == str(medico_uid):
                        medicos[i] = {**m, 'profile_completed': True}
                        updated = True
                        break
                except Exception:
                    continue
            if updated:
                # write back the medicos array
                pid = getattr(doc, 'id', None)
                if pid:
                    doc_ref = db.collection('clinicas').document(pid)
                    doc_ref.update({'medicos': medicos})
                return True
    except Exception:
        pass
    return False


def _safe_snapshot_dict(doc):
    """Segurança ao converter um DocumentSnapshot em dict incluindo o id.
    Se 'doc' não for um snapshot (por exemplo um valor Timestamp), retorna None.
    """
    try:
        if doc is None:
            return None
        # DocumentSnapshot has to_dict() and id attributes
        if hasattr(doc, 'to_dict') and hasattr(doc, 'id'):
            d = doc.to_dict() or {}
            # prefer not to overwrite an existing 'id' key inside the dict
            if not d.get('id'):
                d = d | {'id': doc.id}
            else:
                d['id'] = d.get('id')
            return d
    except Exception:
        return None
    return None

# PACIENTES
def criar_paciente(dados: dict, uid=None):
    """Cria paciente no Firestore com UID específico se fornecido"""
    if uid:
        return db.collection('pacientes').document(uid).set(dados)
    else:
        return db.collection('pacientes').add(dados)

def listar_pacientes():
    docs = db.collection('pacientes').limit(100).stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

@_timed_cache(ttl=600)  # OTIMIZAÇÃO: Cache 10min para reduzir Firestore reads
def obter_paciente(id_paciente: str):
    doc = db.collection('pacientes').document(id_paciente).get()
    if doc.exists:
        sd = _safe_snapshot_dict(doc)
        return sd
    return None


def atualizar_paciente(id_paciente: str, updates: dict):
    """Atualiza campos básicos do documento do paciente."""
    try:
        doc_ref = db.collection('pacientes').document(id_paciente)
        doc_ref.update(updates)
        return True
    except Exception:
        return False

# PROFISSIONAIS
def criar_profissional(dados: dict, uid=None):
    if uid:
        return db.collection('profissionais').document(uid).set(dados)
    else:
        return db.collection('profissionais').add(dados)

@_timed_cache(ttl=600)
def listar_profissionais():
    docs = db.collection('profissionais').limit(100).stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

# Busca profissional pelo UID
@_timed_cache(ttl=600)  # OTIMIZAÇÃO: Cache 10min para reduzir Firestore reads
def obter_profissional(id_profissional: str):
    doc = db.collection('profissionais').document(id_profissional).get()
    if doc.exists:
        return _safe_snapshot_dict(doc)
    return None


def atualizar_profissional(uid: str, updates: dict) -> bool:
    """Atualiza campos do documento do profissional. Retorna True em sucesso."""
    try:
        doc_ref = db.collection('profissionais').document(uid)
        # Prefer update to avoid overwriting
        doc_ref.update(updates)
        return True
    except Exception:
        try:
            # fallback to set merge
            db.collection('profissionais').document(uid).set(updates, merge=True)
            return True
        except Exception:
            return False

# CLÍNICAS
def criar_clinica(dados: dict):
    return db.collection('clinicas').add(dados)

def listar_clinicas():
    docs = db.collection('clinicas').limit(100).stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

@_timed_cache(ttl=600)  # OTIMIZAÇÃO: Cache 10min para reduzir Firestore reads
def obter_clinica(clinica_id: str):
    """Obtém o documento da clínica pelo ID.
    Retorna dict com campos da clínica ou None."""
    try:
        doc = db.collection('clinicas').document(clinica_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
    except Exception:
        pass
    return None

def atualizar_clinica(clinica_id: str, updates: dict) -> bool:
    """Atualiza campos do documento da clínica. Retorna True em sucesso."""
    try:
        doc_ref = db.collection('clinicas').document(clinica_id)
        doc_ref.update(updates)
        return True
    except Exception:
        try:
            db.collection('clinicas').document(clinica_id).set(updates, merge=True)
            return True
        except Exception:
            return False

def obter_clinica_por_recepcionista(recepcionista_uid: str):
    """Procura uma clínica que contenha o recepcionista com o UID fornecido.
    Retorna o documento da clínica (dict com id) ou None."""
    docs = db.collection('clinicas').stream()
    for doc in docs:
        data = doc.to_dict()
        # recepcionistas armazenados como lista de dicts com 'uid'
        receps = data.get('recepcionistas', [])
        for r in receps:
            try:
                if isinstance(r, dict) and r.get('uid') == recepcionista_uid:
                    pid = getattr(doc, 'id', None)
                    return data | {'id': pid}
            except Exception:
                continue
    return None

# FUNCIONÁRIOS DENTRO DA CLÍNICA
def criar_funcionario(id_clinica: str, dados: dict):
    return db.collection('clinicas').document(id_clinica).collection('funcionarios').add(dados)

def listar_funcionarios(id_clinica: str):
    docs = db.collection('clinicas').document(id_clinica).collection('funcionarios').stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

# HORÁRIOS / DISPONIBILIDADE (por profissional)
def adicionar_horario_profissional(profissional_uid: str, data_str: str, hora_str: str):
    """Adiciona um horário disponível ao subcoleção 'horarios' do profissional"""
    payload = {
        'data': data_str,
        'hora': hora_str,
        'disponivel': True
    }
    return db.collection('profissionais').document(profissional_uid).collection('horarios').add(payload)

def listar_horarios_profissional(profissional_uid: str):
    docs = db.collection('profissionais').document(profissional_uid).collection('horarios').stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

def marcar_horario_reservado(profissional_uid: str, data_str: str, hora_str: str):
    """Marca como indisponível todos os horários que batem data/hora (retorna número alterado)"""
    coll = db.collection('profissionais').document(profissional_uid).collection('horarios')
    q = coll.where('data', '==', data_str).where('hora', '==', hora_str).stream()
    updated = 0
    for doc in q:
        doc.reference.update({'disponivel': False})
        updated += 1
    return updated

def marcar_horario_disponivel(profissional_uid: str, data_str: str, hora_str: str):
    """Marca como disponível (True) horários que batem data/hora para um profissional"""
    coll = db.collection('profissionais').document(profissional_uid).collection('horarios')
    q = coll.where('data', '==', data_str).where('hora', '==', hora_str).stream()
    updated = 0
    for doc in q:
        doc.reference.update({'disponivel': True})
        updated += 1
    return updated


def deletar_horario_profissional(profissional_uid: str, horario_id: str):
    """Deleta um documento de horário na subcoleção do profissional."""
    try:
        doc_ref = db.collection('profissionais').document(profissional_uid).collection('horarios').document(horario_id)
        doc_ref.delete()
        return True
    except Exception:
        return False


# CONSULTAS (registros de agendamentos)
def criar_consulta_clinica(dados_consulta: dict):
    consulta = {
        "id_paciente": dados_consulta.get("paciente_uid"),
        "nm_paciente": dados_consulta.get("paciente_nome"),
        "id_profissional": dados_consulta.get("profissional_uid"),
        "nm_profissional": dados_consulta.get("profissional_nome"),
        "id_clinica": dados_consulta.get("clinica_uid"),
        "nm_clinica": dados_consulta.get("clinica_nome"),
        "data_consulta": f"{dados_consulta.get('data')} {dados_consulta.get('hora')}",
        "status": dados_consulta.get("status", "Agendada"),
        "tipo_atendimento": "clinica",
        "created_at": datetime.datetime.now()
    }

    # Garante que os campos obrigatórios estão presentes
    if not all([consulta["id_paciente"], consulta["id_profissional"], 
                consulta["data_consulta"], consulta["status"]]):
        return None

    try:
        doc_ref = db.collection("consultas_clinicas").document()
        doc_ref.set(consulta)
        return doc_ref.id
    except Exception:
        return None


def criar_consulta_autonomo(dados_consulta: dict):
    # Validação inicial dos dados de entrada
    if not dados_consulta:
        print("Erro: dados_consulta está vazio")
        return None
        
    # Extrair dados com validação
    paciente_uid = dados_consulta.get("paciente_uid")
    profissional_uid = dados_consulta.get("profissional_uid")
    data = dados_consulta.get("data")
    hora = dados_consulta.get("hora")
    
    # Validar campos obrigatórios
    if not all([paciente_uid, profissional_uid, data, hora]):
        print(f"Erro: campos obrigatórios faltando - paciente:{paciente_uid}, prof:{profissional_uid}, data:{data}, hora:{hora}")
        return None
        
    # Criar objeto consulta com campos validados
    consulta = {
        "id_paciente": paciente_uid,
        "nm_paciente": dados_consulta.get("paciente_nome", ""),
        "id_profissional": profissional_uid,
        "nm_profissional": dados_consulta.get("profissional_nome", ""),
        "data_consulta": f"{data} {hora}",
        "status": "Agendada",  # Status sempre definido para novas consultas
        "tipo_atendimento": "autonomo",
        "created_at": datetime.datetime.now(),
        "obs": dados_consulta.get("obs", "")
    }
        
    try:
        # Criar documento com ID gerado automaticamente
        doc_ref = db.collection("consultas_autonomos").document()
        consulta['id'] = doc_ref.id  # Adicionar ID ao documento
        doc_ref.set(consulta)
        print(f"Consulta autônoma criada com sucesso. ID: {doc_ref.id}")  # Debug
        return doc_ref.id
    except Exception as e:
        print(f"Erro ao criar consulta autônoma: {str(e)}")  # Debug
        return None

def obter_consulta(consulta_id: str):
    # OTIMIZAÇÃO: Tentar apenas top-level collections, sem loops infinitos
    # Nota: Antes tentava varre TODOS os pacientes e profissionais
    
    # Try top-level 'consultas' first
    try:
        doc = db.collection('consultas').document(consulta_id).get()
        if getattr(doc, 'exists', False):
            sd = _safe_snapshot_dict(doc)
            if sd:
                return sd
    except Exception:
        pass

    # Try consultas_clinicas and consultas_autonomos (rápido - direct document lookup)
    try:
        for collection in ['consultas_clinicas', 'consultas_autonomos']:
            try:
                doc = db.collection(collection).document(consulta_id).get()
                if getattr(doc, 'exists', False):
                    d = doc.to_dict() or {}
                    normalized = {'id': getattr(doc, 'id', None), 'origem': collection, **d}
                    # normalize common fields
                    if 'id_paciente' in d:
                        normalized['paciente_uid'] = d.get('id_paciente')
                    if 'nm_paciente' in d:
                        normalized['paciente_nome'] = d.get('nm_paciente')
                    if 'id_profissional' in d:
                        normalized['profissional_uid'] = d.get('id_profissional')
                    if 'nm_profissional' in d:
                        normalized['profissional_nome'] = d.get('nm_profissional')
                    if d.get('data_consulta'):
                        try:
                            parts = str(d.get('data_consulta')).split()
                            normalized['data'] = parts[0]
                            normalized['hora'] = parts[1] if len(parts) > 1 else ''
                        except Exception:
                            normalized['data'] = d.get('data_consulta')
                            normalized['hora'] = ''
                    else:
                        if d.get('data'):
                            normalized['data'] = d.get('data')
                        if d.get('hora'):
                            normalized['hora'] = d.get('hora')
                    normalized['local'] = d.get('local') or d.get('nm_clinica') or d.get('clinica')
                    normalized['especialidade'] = d.get('especialidade') or d.get('tipo_atendimento')
                    return normalized
            except Exception:
                continue
    except Exception:
        pass

    # REMOVED: Loop infinito que varria TODOS os pacientes
    # REMOVED: Loop infinito que varria TODOS os profissionais
    # Se não encontrou em top-level, assume que não existe

    return None

def deletar_consulta(consulta_id: str):
    try:
        db.collection('consultas').document(consulta_id).delete()
        return True
    except Exception:
        return False


def deletar_consulta_completa(consulta_id: str):
    """Tenta remover a consulta do lugar onde estiver (top-level, consultas_clinicas, consultas_autonomos)
    e também limpa entradas nas subcoleções de paciente/profissional e libera horário.
    Retorna True se alguma remoção foi efetuada, False caso contrário.
    """
    removed_any = False
    try:
        c = obter_consulta(consulta_id)
    except Exception:
        c = None

    # try top-level
    try:
        db.collection('consultas').document(consulta_id).delete()
        removed_any = True
    except Exception:
        pass

    # try clinic/autonomo collections
    try:
        for collection in ['consultas_clinicas', 'consultas_autonomos']:
            try:
                doc_ref = db.collection(collection).document(consulta_id)
                # attempt get to check existence
                doc = doc_ref.get()
                if getattr(doc, 'exists', False):
                    doc_ref.delete()
                    removed_any = True
            except Exception:
                continue
    except Exception:
        pass

    # remove from patient/professional subcollections by key if we have normalized values
    try:
        if c:
            from datetime import datetime as _dt
            paciente_uid = c.get('paciente_uid')
            profissional_uid = c.get('profissional_uid')
            data_str = c.get('data')
            hora_str = c.get('hora')
            try:
                remover_consultas_por_chave(paciente_uid=paciente_uid, profissional_uid=profissional_uid, data_str=data_str, hora_str=hora_str)
            except Exception:
                pass
            try:
                if profissional_uid and data_str and hora_str:
                    marcar_horario_disponivel(profissional_uid, data_str, hora_str)
            except Exception:
                pass
    except Exception:
        pass

    return removed_any


def marcar_consulta_cancelada(consulta_id: str, motivo: str = None, liberar_horario: bool = True):
    """Marca a consulta como cancelada (status='Cancelada') onde quer que esteja.
    Também marca o horário como disponível novamente quando possível.
    Retorna True se alguma alteração foi aplicada, False caso contrário.
    """
    changed = False
    # Logging removido para performance
    try:
        c = obter_consulta(consulta_id)
    except Exception:
        c = None

    # helper to safe update a doc if exists
    def _try_update_doc(ref, payload):
        try:
            ref.update(payload)
            return True
        except Exception:
            try:
                ref.set(payload, merge=True)
                return True
            except Exception:
                return False

    # Try top-level consultas
    try:
        doc_ref = db.collection('consultas').document(consulta_id)
        doc = doc_ref.get()
        if getattr(doc, 'exists', False):
            payload = {'status': 'Cancelada', 'cancelled_at': datetime.datetime.now()}
            if motivo:
                payload['cancel_motivo'] = motivo
            if _try_update_doc(doc_ref, payload):
                changed = True
    except Exception:
        pass

    # Try clinic/autonomo collections
    try:
        for collection in ['consultas_clinicas', 'consultas_autonomos']:
            try:
                doc_ref = db.collection(collection).document(consulta_id)
                doc = doc_ref.get()
                if getattr(doc, 'exists', False):
                    payload = {'status': 'Cancelada', 'cancelled_at': datetime.datetime.now()}
                    if motivo:
                        payload['cancel_motivo'] = motivo
                    if _try_update_doc(doc_ref, payload):
                        changed = True
            except Exception:
                continue
    except Exception:
        pass

    # Update subcollections (patient/professional) if we have keys
    try:
        if c:
            paciente_uid = c.get('paciente_uid')
            profissional_uid = c.get('profissional_uid')
            data_str = c.get('data')
            hora_str = c.get('hora')

            if paciente_uid:
                try:
                    ref = db.collection('pacientes').document(paciente_uid).collection('consultas').document(consulta_id)
                    payload = {'status': 'Cancelada', 'cancelled_at': datetime.datetime.now()}
                    if motivo:
                        payload['cancel_motivo'] = motivo
                    if _try_update_doc(ref, payload):
                        changed = True
                except Exception:
                    pass

            if profissional_uid:
                try:
                    ref2 = db.collection('profissionais').document(profissional_uid).collection('consultas').document(consulta_id)
                    payload = {'status': 'Cancelada', 'cancelled_at': datetime.datetime.now()}
                    if motivo:
                        payload['cancel_motivo'] = motivo
                    if _try_update_doc(ref2, payload):
                        changed = True
                except Exception:
                    pass

            # try to free horario (unless caller requested otherwise)
            try:
                if liberar_horario and profissional_uid and data_str and hora_str:
                    marcar_horario_disponivel(profissional_uid, data_str, hora_str)
            except Exception:
                pass
    except Exception:
        pass

    return changed


def atualizar_consulta(consulta_id: str, updates: dict):
    """Atualiza campos de uma consulta no documento top-level.
    Retorna True em sucesso, False caso contrário."""
    try:
        doc_ref = db.collection('consultas').document(consulta_id)
        doc_ref.update(updates)
        return True
    except Exception:
        return False


def finalizar_consultas_passadas():
    """Varre consultas e marca como 'Concluída' aquelas cuja data/hora já passaram.
    Atualiza também as entradas correspondentes nas subcoleções de pacientes e profissionais.
    Retorna o número de consultas atualizadas."""
    now = datetime.datetime.now()
    changed = 0
    collections = ['consultas', 'consultas_clinicas', 'consultas_autonomos']
    for collection in collections:
        try:
            q = db.collection(collection).where('status', '==', 'Agendada').stream()
            for doc in q:
                try:
                    d = doc.to_dict() or {}
                    data_consulta = d.get('data_consulta') or (d.get('data') and d.get('hora') and f"{d.get('data')} {d.get('hora')}")
                    if not data_consulta:
                        continue
                    # try common format YYYY-MM-DD HH:MM
                    try:
                        dt = datetime.datetime.strptime(data_consulta, "%Y-%m-%d %H:%M")
                    except Exception:
                        try:
                            # try ISO parse fallback
                            dt = datetime.datetime.fromisoformat(data_consulta)
                        except Exception:
                            continue
                    if dt < now:
                        ref = doc.reference
                        payload = {'status': 'Concluída', 'concluded_at': now}
                        try:
                            ref.update(payload)
                            changed += 1
                        except Exception:
                            try:
                                ref.set(payload, merge=True)
                                changed += 1
                            except Exception:
                                pass

                        # try to update subcollections for paciente/profissional
                        paciente_uid = d.get('id_paciente') or d.get('paciente_uid') or d.get('paciente_id')
                        profissional_uid = d.get('id_profissional') or d.get('profissional_uid') or d.get('profissional_id')
                        # try to extract data/hora components
                        data_part = d.get('data') or (data_consulta.split(' ')[0] if ' ' in data_consulta else None)
                        hora_part = d.get('hora') or (data_consulta.split(' ')[1] if ' ' in data_consulta else None)

                        if paciente_uid and data_part and hora_part:
                            try:
                                pcoll = db.collection('pacientes').document(paciente_uid).collection('consultas')
                                q2 = pcoll.where('data', '==', data_part).where('hora', '==', hora_part).stream()
                                for pdoc in q2:
                                    try:
                                        pdoc.reference.update(payload)
                                    except Exception:
                                        pdoc.reference.set(payload, merge=True)
                            except Exception:
                                pass

                        if profissional_uid and data_part and hora_part:
                            try:
                                prcoll = db.collection('profissionais').document(profissional_uid).collection('consultas')
                                q3 = prcoll.where('data', '==', data_part).where('hora', '==', hora_part).stream()
                                for prdoc in q3:
                                    try:
                                        prdoc.reference.update(payload)
                                    except Exception:
                                        prdoc.reference.set(payload, merge=True)
                            except Exception:
                                pass
                except Exception:
                    continue
        except Exception:
            continue
    try:
        with open('remarcar_debug.log', 'a', encoding='utf-8') as _log:
            _log.write(f"[finalizar_consultas_passadas] updated={changed}\n")
    except Exception:
        pass
    return changed

def remover_consultas_por_chave(paciente_uid: str = None, profissional_uid: str = None, data_str: str = None, hora_str: str = None):
    """Remove consultas que correspondam à chave nos subcollections de paciente e profissional."""
    removed = 0
    # remove from paciente subcollection
    try:
        if paciente_uid:
            coll = db.collection('pacientes').document(paciente_uid).collection('consultas')
            q = coll
            if data_str:
                q = q.where('data', '==', data_str)
            if hora_str:
                q = q.where('hora', '==', hora_str)
            for doc in q.stream():
                # optional further filter by profissional_uid
                d = doc.to_dict()
                if profissional_uid and d.get('profissional_uid') != profissional_uid:
                    continue
                doc.reference.delete()
                removed += 1
    except Exception:
        pass

    # remove from profissional subcollection
    try:
        if profissional_uid:
            coll = db.collection('profissionais').document(profissional_uid).collection('consultas')
            q = coll
            if data_str:
                q = q.where('data', '==', data_str)
            if hora_str:
                q = q.where('hora', '==', hora_str)
            for doc in q.stream():
                d = doc.to_dict()
                if paciente_uid and d.get('paciente_uid') != paciente_uid:
                    continue
                doc.reference.delete()
                removed += 1
    except Exception:
        pass

    return removed

def listar_consultas_profissional(profissional_uid: str):
    results = []

    for collection in ["consultas_clinicas", "consultas_autonomos"]:
        try:
            docs = db.collection(collection).where("id_profissional", "==", profissional_uid).stream()
            for doc in docs:
                d = doc.to_dict() or {}
                # normalize fields so views can expect the same keys
                normalized = {
                    'id': getattr(doc, 'id', None),
                    'origem': collection,
                    # original raw fields preserved
                    **d
                }

                # map clinic/autonomo naming to generic keys
                # paciente
                if 'id_paciente' in d:
                    normalized['paciente_uid'] = d.get('id_paciente')
                if 'nm_paciente' in d:
                    normalized['paciente_nome'] = d.get('nm_paciente')
                # profissional
                if 'id_profissional' in d:
                    normalized['profissional_uid'] = d.get('id_profissional')
                if 'nm_profissional' in d:
                    normalized['profissional_nome'] = d.get('nm_profissional')

                # date/time may be stored as combined field 'data_consulta' like 'YYYY-MM-DD HH:MM' or as separate
                if d.get('data_consulta'):
                    try:
                        parts = str(d.get('data_consulta')).split()
                        normalized['data'] = parts[0]
                        normalized['hora'] = parts[1] if len(parts) > 1 else ''
                    except Exception:
                        normalized['data'] = d.get('data_consulta')
                        normalized['hora'] = ''
                else:
                    # keep existing keys if present
                    if d.get('data'):
                        normalized['data'] = d.get('data')
                    if d.get('hora'):
                        normalized['hora'] = d.get('hora')

                # local / especialidade - try common keys
                normalized['local'] = d.get('local') or d.get('nm_clinica') or d.get('clinica')
                normalized['especialidade'] = d.get('especialidade') or d.get('tipo_atendimento')

                results.append(normalized)
        except Exception:
            continue

    return results


def listar_consultas_paciente(paciente_uid: str):
    results = []

    for collection in ["consultas_clinicas", "consultas_autonomos"]:
        try:
            docs = db.collection(collection).where("id_paciente", "==", paciente_uid).stream()
            for doc in docs:
                d = doc.to_dict() or {}
                normalized = {'id': getattr(doc, 'id', None), 'origem': collection, **d}
                # normalize patient/professional naming
                if 'id_paciente' in d:
                    normalized['paciente_uid'] = d.get('id_paciente')
                if 'nm_paciente' in d:
                    normalized['paciente_nome'] = d.get('nm_paciente')
                if 'id_profissional' in d:
                    normalized['profissional_uid'] = d.get('id_profissional')
                if 'nm_profissional' in d:
                    normalized['profissional_nome'] = d.get('nm_profissional')

                if d.get('data_consulta'):
                    try:
                        parts = str(d.get('data_consulta')).split()
                        normalized['data'] = parts[0]
                        normalized['hora'] = parts[1] if len(parts) > 1 else ''
                    except Exception:
                        normalized['data'] = d.get('data_consulta')
                        normalized['hora'] = ''
                else:
                    if d.get('data'):
                        normalized['data'] = d.get('data')
                    if d.get('hora'):
                        normalized['hora'] = d.get('hora')

                normalized['local'] = d.get('local') or d.get('nm_clinica') or d.get('clinica')
                normalized['especialidade'] = d.get('especialidade') or d.get('tipo_atendimento')

                results.append(normalized)
        except Exception:
            continue

    return results


def adicionar_prontuario(paciente_uid: str, prontuario: dict):
    """Adiciona um prontuário dentro da subcoleção do paciente."""
    return db.collection('pacientes').document(paciente_uid).collection('prontuarios').add(prontuario)

def adicionar_consulta_a_paciente(paciente_uid: str, consulta: dict, consulta_id: str = None):
    """Adiciona a consulta dentro da subcoleção do paciente para facilidade de leitura.
    Se consulta_id for fornecido, grava o documento com esse id (útil para referenciar o top-level)."""
    if not paciente_uid or not consulta:
        return None
        
    try:
        coll = db.collection('pacientes').document(paciente_uid).collection('consultas')
        if consulta_id:
            doc_ref = coll.document(consulta_id)
            consulta['id'] = consulta_id  # Garante que o ID está no documento
            doc_ref.set(consulta)
            return consulta_id
        else:
            doc_ref = coll.document()
            consulta['id'] = doc_ref.id
            doc_ref.set(consulta)
            return doc_ref.id
    except Exception:
        return None

def adicionar_consulta_a_profissional(profissional_uid: str, consulta: dict, consulta_id: str = None):
    """Adiciona a consulta dentro da subcoleção do profissional (profissionais/{uid}/consultas).
    Se consulta_id for fornecido, grava o documento com esse id."""
    coll = db.collection('profissionais').document(profissional_uid).collection('consultas')
    if consulta_id:
        coll.document(consulta_id).set(consulta)
        return consulta_id
    return coll.add(consulta)

def listar_consultas_por_email(paciente_email: str):
    """Fallback: listar consultas buscando pelo email do paciente"""
    try:
        docs = db.collection('consultas').where('paciente_email', '==', paciente_email).stream()
        results = []
        for doc in docs:
            sd = _safe_snapshot_dict(doc)
            if sd:
                results.append(sd)
        if results:
            return results
    except Exception:
        pass
    # also try patient subcollection
    try:
        # find paciente document by email
        pacientes = db.collection('pacientes').where('email', '==', paciente_email).stream()
        for p in pacientes:
            pid = getattr(p, 'id', None)
            if not pid:
                psd = _safe_snapshot_dict(p)
                pid = psd.get('id') if psd else None
            if not pid:
                continue
            docs2 = db.collection('pacientes').document(pid).collection('consultas').stream()
            results2 = []
            for doc in docs2:
                sd = _safe_snapshot_dict(doc)
                if sd:
                    results2.append(sd)
            return results2
    except Exception:
        pass
    return []

def listar_consultas_completas_paciente(paciente_uid: str = None, paciente_email: str = None, paciente_nome: str = None):
    """Aggregate consultas for a patient from multiple sources (top-level, patient subcollection, by email or name) and deduplicate."""
    seen = set()
    results = []

    def add_consulta(c):
        # create a dedupe key using stable fields
        key = (c.get('paciente_uid'), c.get('profissional_uid'), c.get('data'), c.get('hora'))
        if key in seen:
            return
        seen.add(key)
        results.append(c)

    # top-level by uid
    try:
        if paciente_uid:
            docs = db.collection('consultas').where('paciente_uid', '==', paciente_uid).stream()
            for doc in docs:
                sd = _safe_snapshot_dict(doc)
                if sd:
                    add_consulta(sd)
    except Exception:
        pass

    # top-level by email
    try:
        if paciente_email:
            docs = db.collection('consultas').where('paciente_email', '==', paciente_email).stream()
            for doc in docs:
                sd = _safe_snapshot_dict(doc)
                if sd:
                    add_consulta(sd)
    except Exception:
        pass


    try:
        if paciente_uid:
            for collection in ["consultas_clinicas", "consultas_autonomos"]:
                try:
                    docs = db.collection(collection).where('id_paciente', '==', paciente_uid).limit(1000).stream()
                    for doc in docs:
                        d = doc.to_dict() or {}
                        normalized = {'id': getattr(doc, 'id', None), 'origem': collection, **d}
                        # normalize field names used elsewhere
                        if 'id_paciente' in d:
                            normalized['paciente_uid'] = d.get('id_paciente')
                        if 'nm_paciente' in d:
                            normalized['paciente_nome'] = d.get('nm_paciente')
                        if 'id_profissional' in d:
                            normalized['profissional_uid'] = d.get('id_profissional')
                        if 'nm_profissional' in d:
                            normalized['profissional_nome'] = d.get('nm_profissional')

                        if d.get('data_consulta'):
                            try:
                                parts = str(d.get('data_consulta')).split()
                                normalized['data'] = parts[0]
                                normalized['hora'] = parts[1] if len(parts) > 1 else ''
                            except Exception:
                                normalized['data'] = d.get('data_consulta')
                                normalized['hora'] = ''
                        else:
                            if d.get('data'):
                                normalized['data'] = d.get('data')
                            if d.get('hora'):
                                normalized['hora'] = d.get('hora')

                        normalized['local'] = d.get('local') or d.get('nm_clinica') or d.get('clinica')
                        normalized['especialidade'] = d.get('especialidade') or d.get('tipo_atendimento')

                        add_consulta(normalized)
                except Exception:
                    continue
    except Exception:
        pass

    # patient subcollection
    try:
        if paciente_uid:
            docs = db.collection('pacientes').document(paciente_uid).collection('consultas').limit(1000).stream()
            for doc in docs:
                sd = _safe_snapshot_dict(doc)
                if sd:
                    add_consulta(sd)
    except Exception:
        pass

    # by exact patient name
    try:
        if paciente_nome:
            docs = db.collection('consultas').where('paciente_nome', '==', paciente_nome).limit(1000).stream()
            for doc in docs:
                sd = _safe_snapshot_dict(doc)
                if sd:
                    add_consulta(sd)
    except Exception:
        pass

    # as last resort, try lookup by patient email mapping to patient doc
    try:
        if paciente_email and not results:
            pacientes = db.collection('pacientes').where('email', '==', paciente_email).limit(10).stream()
            for p in pacientes:
                pid = getattr(p, 'id', None)
                if not pid:
                    psd = _safe_snapshot_dict(p)
                    pid = psd.get('id') if psd else None
                if not pid:
                    continue
                docs = db.collection('pacientes').document(pid).collection('consultas').limit(1000).stream()
                for doc in docs:
                    sd = _safe_snapshot_dict(doc)
                    if sd:
                        add_consulta(sd)
    except Exception:
        pass

   

    # Enrich results with profissional_nome and paciente_nome where possible
    enriched = []
    for c in results:
        # populate profissional_nome
        if not c.get('profissional_nome') and c.get('profissional_uid'):
            try:
                p = obter_profissional(c.get('profissional_uid'))
                if p and p.get('nome'):
                    c['profissional_nome'] = p.get('nome')
            except Exception:
                pass
        # populate paciente_nome
        if not c.get('paciente_nome') and c.get('paciente_uid'):
            try:
                pac = obter_paciente(c.get('paciente_uid'))
                if pac and pac.get('nome'):
                    c['paciente_nome'] = pac.get('nome')
            except Exception:
                pass
        enriched.append(c)

    return enriched

def listar_consultas_por_nome(paciente_nome: str):
    """Fallback: listar consultas buscando pelo nome do paciente (útil quando UID não bate por algum motivo)"""
    docs = db.collection('consultas').where('paciente_nome', '==', paciente_nome).stream()
    results = []
    for doc in docs:
        sd = _safe_snapshot_dict(doc)
        if sd:
            results.append(sd)
    return results

# --- Prontuario functions (stubs, to resolve import error) ---

# Busca o prontuário em todas as subcoleções de prontuários dos pacientes
def obter_prontuario(prontuario_id: str):
    """Busca o prontuário pelo ID em todas as subcoleções de prontuários dos pacientes."""
    pacientes = db.collection('pacientes').stream()
    for paciente in pacientes:
        pid = getattr(paciente, 'id', None)
        if not pid:
            psd = _safe_snapshot_dict(paciente)
            pid = psd.get('id') if psd else None
        if not pid:
            continue
        prontuarios = db.collection('pacientes').document(pid).collection('prontuarios').stream()
        for prontuario in prontuarios:
            p_rid = getattr(prontuario, 'id', None)
            if not p_rid:
                prsd = _safe_snapshot_dict(prontuario)
                p_rid = prsd.get('id') if prsd else None
            if p_rid == prontuario_id:
                sd = _safe_snapshot_dict(prontuario)
                if sd is None:
                    return None
                sd['paciente_uid'] = pid
                return sd
    return None


def atualizar_prontuario(prontuario_id: str, dados: dict):
    """Atualiza o prontuário pelo ID em todas as subcoleções de prontuários dos pacientes."""
    pacientes = db.collection('pacientes').stream()
    for paciente in pacientes:
        pid = getattr(paciente, 'id', None)
        if not pid:
            psd = _safe_snapshot_dict(paciente)
            pid = psd.get('id') if psd else None
        if not pid:
            continue
        prontuarios = db.collection('pacientes').document(pid).collection('prontuarios').stream()
        for prontuario in prontuarios:
            pr_id = getattr(prontuario, 'id', None)
            if not pr_id:
                prsd = _safe_snapshot_dict(prontuario)
                pr_id = prsd.get('id') if prsd else None
            if pr_id == prontuario_id:
                db.collection('pacientes').document(pid).collection('prontuarios').document(prontuario_id).update(dados)
                return True
    return False


def excluir_prontuario(prontuario_id: str):
    """Exclui o prontuário pelo ID em todas as subcoleções de prontuários dos pacientes."""
    pacientes = db.collection('pacientes').stream()
    for paciente in pacientes:
        pid = getattr(paciente, 'id', None)
        if not pid:
            psd = _safe_snapshot_dict(paciente)
            pid = psd.get('id') if psd else None
        if not pid:
            continue
        prontuarios = db.collection('pacientes').document(pid).collection('prontuarios').stream()
        for prontuario in prontuarios:
            pr_id = getattr(prontuario, 'id', None)
            if not pr_id:
                prsd = _safe_snapshot_dict(prontuario)
                pr_id = prsd.get('id') if prsd else None
            if pr_id == prontuario_id:
                db.collection('pacientes').document(pid).collection('prontuarios').document(prontuario_id).delete()
                return True
    return False


def verificar_prontuario_existente(prontuario_id: str):
    """Verifica se existe um prontuário com o ID fornecido em qualquer paciente."""
    return obter_prontuario(prontuario_id) is not None

