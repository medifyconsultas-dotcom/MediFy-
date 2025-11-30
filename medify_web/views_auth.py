from django.shortcuts import render, redirect
from django.conf import settings
import requests
import datetime
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.contrib import messages
import logging
from requests.exceptions import RequestException

API_KEY_FIREBASE = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
PROJECT_ID = "medify-401a8"

# Module-level requests session with connection pooling and retries to speed up
# repeated HTTP calls (identitytoolkit + firestore REST).
_session = requests.Session()
_retries = Retry(total=2, backoff_factor=0.2, status_forcelist=(429, 500, 502, 503, 504))
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=_retries)
_session.mount('https://', adapter)
_session.mount('http://', adapter)

DEFAULT_HTTP_TIMEOUT = 6  # seconds


def esqueci_senha_view(request):
    """Página simples para o fluxo 'Esqueci minha senha' — envia email de redefinição.
    GET: renderiza um pequeno formulário (se tiver template). POST: envia o email e redireciona com message.
    """
    if request.method == 'POST':
        email = request.POST.get('email')
        if not email:
            messages.error(request, 'E-mail não informado.')
            return redirect('medify_web:auth')
        from .firebase_services import enviar_email_redefinicao
        resp = enviar_email_redefinicao(email)
        if resp.get('email'):
            messages.success(request, 'E-mail de redefinição enviado! Verifique sua caixa de entrada.')
        else:
            erro = resp.get('error', {}).get('message', 'Erro ao enviar e-mail de redefinição.')
            messages.error(request, f'Erro: {erro}')
        return redirect('medify_web:auth')
    # GET -> render a small template if exists, otherwise redirect to auth
    try:
        return render(request, 'Auth/esqueci_senha.html')
    except Exception:
        return redirect('medify_web:auth')


def alterar_senha_view(request):
    """Permite ao usuário autenticado alterar sua senha atual.
    Exige que `request.session['idToken']` esteja presente.
    """
    id_token = request.session.get('idToken')
    if not id_token:
        messages.error(request, 'Sessão inválida. Faça login novamente.')
        return redirect('medify_web:auth')

    if request.method == 'POST':
        nova = request.POST.get('nova_senha')
        confirma = request.POST.get('confirma_senha')
        if not nova or not confirma:
            messages.error(request, 'Preencha os dois campos de senha.')
            return redirect('medify_web:perfilPaciente')
        if nova != confirma:
            messages.error(request, 'As senhas não conferem.')
            return redirect('medify_web:perfilPaciente')

        # validação mais forte: verificar composição da senha
        try:
            from .password_utils import validate_password
            valid, msg = validate_password(nova)
            if not valid:
                messages.error(request, msg)
                return redirect('medify_web:perfilPaciente')
        except Exception:
            # em caso de erro na validação, cair de volta para checagem mínima
            if len(nova) < 8:
                messages.error(request, 'A nova senha deve ter pelo menos 8 caracteres.')
                return redirect('medify_web:perfilPaciente')

        from .firebase_services import alterar_senha_com_token
        resp = alterar_senha_com_token(id_token, nova)
        if resp.get('error'):
            msg = resp.get('error', {}).get('message', str(resp.get('error')))
            messages.error(request, f'Erro ao alterar senha: {msg}')
            return redirect('medify_web:perfilPaciente')

        # Em caso de sucesso, o Firebase retorna um novo idToken; atualize a sessão
        new_token = resp.get('idToken')
        if new_token:
            request.session['idToken'] = new_token
        messages.success(request, 'Senha alterada com sucesso.')
        return redirect('medify_web:perfilPaciente')

    # GET -> redirect to profile page where the form usually lives
    return redirect('medify_web:perfilPaciente')

def auth_view(request):
    erro = None
    # Se já existe sessão autenticada, redirecionar ao dashboard apropriado
    try:
        if request.method == 'GET' and request.session.get('idToken'):
            perfil_sess = request.session.get('perfil')
            if perfil_sess == 'paciente':
                return redirect('medify_web:dashboard_paciente')
            if perfil_sess == 'profissional':
                return redirect('medify_web:dashboard_profissional')
            if perfil_sess == 'clinica':
                return redirect('medify_web:dashboard_clinica')
            if perfil_sess == 'medico':
                if request.session.get('needs_profile_completion'):
                    return redirect('medify_web:editar_perfil_profissional')
                return redirect('medify_web:dashboard_medico')
            if perfil_sess == 'recepcionista':
                return redirect('medify_web:dashboard_recepcionista')
            # fallback: se tiver localId, redirecionar para paciente por padrão
            if request.session.get('localId'):
                return redirect('medify_web:dashboard_paciente')
    except Exception:
        pass
    if request.method == 'POST':
        email = request.POST.get('email')
        senha = request.POST.get('senha')

        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY_FIREBASE}"
        payload = {"email": email, "password": senha, "returnSecureToken": True}
        try:
            r = _session.post(url, json=payload, timeout=DEFAULT_HTTP_TIMEOUT)
        except RequestException:
            # degrade to plain requests.post (fallback) to preserve behavior
            try:
                r = requests.post(url, json=payload, timeout=DEFAULT_HTTP_TIMEOUT)
            except Exception:
                r = None

        if r.status_code == 200:
            data = r.json()
            # store tokens and identifiers in session
            request.session['idToken'] = data['idToken']
            request.session['email'] = data['email']
            request.session['localId'] = data['localId']  # <-- ESSENCIAL!
            uid = data['localId']
            # Use the returned idToken as a Bearer token when calling Firestore REST
            id_token = data.get('idToken')
            headers = {"Authorization": f"Bearer {id_token}"} if id_token else {}
            # registrar timestamps para suporte a idle/absolute session timeouts
            try:
                now_ts = int(time.time())
                request.session['_auth_created_at'] = now_ts
                request.session['_auth_last_activity'] = now_ts
            except Exception:
                # não bloquear o login se falhar ao gravar timestamps
                pass

            # Buscar perfil do usuário nas coleções corretas (faz requests em paralelo para reduzir latência)
            perfil = None
            debug_urls = []
            base = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
            urls_to_check = {
                'paciente': f"{base}/pacientes/{uid}",
                'profissional': f"{base}/profissionais/{uid}",
                'clinica': f"{base}/clinicas/{uid}"
            }

            try:
                # fire off the three GETs concurrently
                futures = {}
                with ThreadPoolExecutor(max_workers=3) as exe:
                    for role, u in urls_to_check.items():
                        debug_urls.append(u)
                        futures[exe.submit(_session.get, u, headers=headers, timeout=DEFAULT_HTTP_TIMEOUT)] = role
                    found_role = None
                    for fut in as_completed(futures):
                        role = futures[fut]
                        try:
                            resp = fut.result()
                        except Exception:
                            resp = None
                        if resp is not None and getattr(resp, 'status_code', None) == 200:
                            found_role = role
                            break

                if found_role:
                    perfil = found_role
                    if perfil == 'paciente':
                        return redirect('medify_web:dashboard_paciente')
                    if perfil == 'profissional':
                        return redirect('medify_web:dashboard_profissional')
                    if perfil == 'clinica':
                        # found clinic document with same uid
                        pass
                else:
                    # fallback: check all clinicas documents to find medico/recepcionista entries (sequential)
                    clinicas_url = f"{base}/clinicas"
                    clinicas_resp = _session.get(clinicas_url, headers=headers, timeout=DEFAULT_HTTP_TIMEOUT)
                    if clinicas_resp.status_code == 200:
                        clinicas = clinicas_resp.json().get('documents', [])
                        for clinica in clinicas:
                            fields = clinica.get('fields', {})
                            medicos = fields.get('medicos', {}).get('arrayValue', {}).get('values', [])
                            for medico in medicos:
                                medico_fields = medico.get('mapValue', {}).get('fields', {})
                                if medico_fields.get('uid', {}).get('stringValue', '') == uid:
                                    perfil = 'medico'
                                    break
                            recepcionistas = fields.get('recepcionistas', {}).get('arrayValue', {}).get('values', [])
                            for recep in recepcionistas:
                                recep_fields = recep.get('mapValue', {}).get('fields', {})
                                if recep_fields.get('uid', {}).get('stringValue', '') == uid:
                                    perfil = 'recepcionista'
                                    break
                            if perfil:
                                break
            except Exception:
                # if parallel check fails for any reason, fall back to original sequential checks
                perfil = None
                debug_urls = []
                # 1. Paciente
                firestore_url = f"{base}/pacientes/{uid}"
                debug_urls.append(firestore_url)
                profile_resp = requests.get(firestore_url, headers=headers)
                if profile_resp.status_code == 200:
                    perfil = 'paciente'
                    return redirect('medify_web:dashboard_paciente')
                # 2. Profissional
                firestore_url = f"{base}/profissionais/{uid}"
                debug_urls.append(firestore_url)
                profile_resp = requests.get(firestore_url, headers=headers)
                if profile_resp.status_code == 200:
                    perfil = 'profissional'
                    return redirect('medify_web:dashboard_profissional')
                # 3. Clínica
                firestore_url = f"{base}/clinicas/{uid}"
                debug_urls.append(firestore_url)
                profile_resp = requests.get(firestore_url, headers=headers)
                if profile_resp.status_code == 200:
                    perfil = 'clinica'
                else:
                    # check list of clinics
                    clinicas_url = f"{base}/clinicas"
                    clinicas_resp = requests.get(clinicas_url, headers=headers)
                    if clinicas_resp.status_code == 200:
                        clinicas = clinicas_resp.json().get('documents', [])
                        for clinica in clinicas:
                            fields = clinica.get('fields', {})
                            medicos = fields.get('medicos', {}).get('arrayValue', {}).get('values', [])
                            for medico in medicos:
                                medico_fields = medico.get('mapValue', {}).get('fields', {})
                                if medico_fields.get('uid', {}).get('stringValue', '') == uid:
                                    perfil = 'medico'
                                    break
                            recepcionistas = fields.get('recepcionistas', {}).get('arrayValue', {}).get('values', [])
                            for recep in recepcionistas:
                                recep_fields = recep.get('mapValue', {}).get('fields', {})
                                if recep_fields.get('uid', {}).get('stringValue', '') == uid:
                                    perfil = 'recepcionista'
                                    break
                            if perfil:
                                break

            request.session['perfil'] = perfil
            # If this user is a medico created via clinic, check if their clinic-profile is complete
            if perfil == 'medico':
                try:
                    from .firebase_services import is_medico_profile_complete
                    needs_completion = not is_medico_profile_complete(uid)
                    request.session['needs_profile_completion'] = needs_completion
                except Exception:
                    request.session['needs_profile_completion'] = False
            if perfil == 'paciente':
                return redirect('medify_web:dashboard_paciente')
            elif perfil == 'profissional':
                return redirect('medify_web:dashboard_profissional')
            elif perfil == 'clinica':
                return redirect('medify_web:dashboard_clinica')
            elif perfil == 'medico':
                # If this medico needs to complete profile, force them to the edit page on first login
                if request.session.get('needs_profile_completion'):
                    return redirect('medify_web:editar_perfil_profissional')
                return redirect('medify_web:dashboard_medico')
            elif perfil == 'recepcionista':
                return redirect('medify_web:dashboard_recepcionista')
            else:
                erro = f'Perfil não encontrado para este usuário. UID: {uid}. URLs consultadas: {debug_urls}'
        else:
            erro = 'Credenciais inválidas.'

    return render(request, 'Auth/auth.html', {'erro': erro})


def cadastrar_view(request):
    erro = None
    if request.method == 'POST':
        perfil = request.POST.get('perfil')
        nome = request.POST.get('nome')
        email = request.POST.get('email')
        senha = request.POST.get('senha')

        # validar senha antes de tentar criar no Firebase Auth
        try:
            from .password_utils import validate_password
            valid, msg = validate_password(senha)
            if not valid:
                erro = msg
                return render(request, 'Auth/auth.html', {'erro': erro})
        except Exception:
            # se houver erro de import/validação, manter validação mínima
            if not senha or len(senha) < 8:
                erro = 'Senha deve ter pelo menos 8 caracteres.'
                return render(request, 'Auth/auth.html', {'erro': erro})

        # 1. Criar usuário no Firebase Auth (principal)
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY_FIREBASE}"
        payload = {"email": email, "password": senha, "returnSecureToken": True}
        try:
            r = requests.post(url, json=payload, timeout=10)
        except RequestException as e:
            logging.exception('Erro ao chamar Firebase Auth')
            erro = 'Erro de comunicação com o serviço de autenticação. Tente novamente mais tarde.'
            return render(request, 'Auth/auth.html', {'erro': erro})

        if r.status_code == 200:
            data = r.json()
            uid = data['localId']
            idToken = data['idToken']
            headers = {"Authorization": f"Bearer {idToken}"}
            now_iso = datetime.datetime.utcnow().isoformat() + 'Z'

            # helper para escolher o primeiro telefone não-vazio quando há múltiplos inputs com mesmo name
            def _pick_telefone():
                try:
                    vals = request.POST.getlist('telefone')
                    for v in vals:
                        if v and str(v).strip():
                            return v.strip()
                except Exception:
                    pass
                return request.POST.get('telefone', '')

            if perfil == 'paciente':
                from .firebase_services import criar_paciente
                paciente_data = {
                    "id": uid,
                    "nome": nome,
                    "email": email,
                    "data_nascimento": request.POST.get('data_nascimento', ''),
                    "telefone": _pick_telefone(),
                    "cpf": request.POST.get('cpf', ''),
                    "endereco": request.POST.get('endereco', ''),
                    "plano": request.POST.get('plano', ''),
                    "data_criacao": now_iso
                }
                try:
                    criar_paciente(paciente_data, uid=uid)
                except Exception as e:
                    erro = f'Erro ao salvar paciente no Firestore: {str(e)}'
                    return render(request, 'Auth/auth.html', {'erro': erro})

            elif perfil == 'profissional':
                from .firebase_services import criar_profissional
                from .especialidades import corrigir_especialidade
                
                # Corrigir especialidade antes de salvar
                especialidade_input = request.POST.get('especialidade', '').strip()
                especialidade_corrigida = None
                if especialidade_input:
                    especialidade_corrigida = corrigir_especialidade(especialidade_input)
                    if especialidade_corrigida and especialidade_corrigida != especialidade_input:
                        # Se foi corrigida, pode mostrar mensagem ao usuário (opcional)
                        pass
                
                profissional_data = {
                    "id": uid,
                    "nome": nome,
                    "email": email,
                    "perfil": "profissional",  # IMPORTANTE: Campo perfil para o desktop encontrar
                    "especialidade": especialidade_corrigida or especialidade_input,
                    "crm": request.POST.get('crm', ''),
                    "cpf_cnpj": request.POST.get('cpf_cnpj', ''),
                    "telefone": _pick_telefone(),
                    "endereco": request.POST.get('endereco', ''),
                    "idClinica": None,  # Profissional autônomo
                    "data_criacao": now_iso
                }
                try:
                    criar_profissional(profissional_data, uid=uid)
                except Exception as e:
                    erro = f'Erro ao salvar profissional no Firestore: {str(e)}'
                    return render(request, 'Auth/auth.html', {'erro': erro})

            elif perfil == 'clinica':
                # Coletar dados da clínica
                nome_fantasia = request.POST.get('nome_fantasia', nome)
                cnpj = request.POST.get('cnpj', '')
                endereco = request.POST.get('endereco', '')
                telefone = _pick_telefone()
                # Importante: remoção da criação de funcionários via web.
                # A clínica só poderá cadastrar funcionários (médicos/recepcionistas)
                # através do aplicativo desktop. Aqui no web mantemos as listas
                # vazias para evitar criação insegura de contas.
                medicos = []
                recepcionistas = []

                # Salvar clínica no Firestore
                firestore_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/clinicas?documentId={uid}"
                
                # Criar estrutura base do payload
                firestore_payload = {
                    "fields": {
                        "nome": {"stringValue": nome},
                        "nome_fantasia": {"stringValue": nome_fantasia},
                        "email": {"stringValue": email},
                        "cnpj": {"stringValue": cnpj},
                        "endereco": {"stringValue": endereco},
                        "telefone": {"stringValue": telefone},
                        "perfil": {"stringValue": "clinica"},
                        "id": {"stringValue": uid},
                        "data_criacao": {"timestampValue": now_iso},
                        "medicos": {
                            "arrayValue": {
                                "values": []
                            }
                        },
                        "recepcionistas": {
                            "arrayValue": {
                                "values": []
                            }
                        }
                    }
                }
                try:
                    firestore_resp = requests.post(firestore_url, headers=headers, json=firestore_payload, timeout=10)
                    logging.debug('Firestore clinica response: %s %s', firestore_resp.status_code, firestore_resp.text)
                    if firestore_resp.status_code not in (200, 201):
                        # Não interromper o fluxo de cadastro do usuário principal,
                        # mas registrar erro e informar ao usuário.
                        logging.error('Falha ao salvar clinica no Firestore: %s', firestore_resp.text)
                        erro = 'Cadastro realizado, porém houve um problema ao salvar os dados da clínica. Contate o suporte.'
                        return render(request, 'Auth/auth.html', {'erro': erro})
                except RequestException:
                    logging.exception('Erro ao salvar clinica no Firestore')
                    erro = 'Cadastro realizado, porém não foi possível comunicar com o banco de dados. Tente novamente mais tarde.'
                    return render(request, 'Auth/auth.html', {'erro': erro})

            # 3. Mensagem de sucesso
            messages.success(request, 'Cadastro realizado com sucesso! Faça login para continuar.')
            return redirect('medify_web:auth')
        else:
            try:
                erro_firebase = r.json().get('error', {}).get('message', '')
                if erro_firebase:
                    erro = f'Erro ao cadastrar: {erro_firebase.replace("_", " ").capitalize()}.'
                else:
                    erro = 'Erro ao cadastrar. Tente novamente.'
            except Exception:
                erro = 'Erro ao cadastrar. Tente novamente.'

    return render(request, 'Auth/auth.html', {'erro': erro})


def salvar_perfil_firestore(uid, perfil, idToken, email):
    url = f"https://firestore.googleapis.com/v1/projects/SEU_PROJETO/databases/(default)/documents/users?documentId={uid}"
    headers = {"Authorization": f"Bearer {idToken}"}
    payload = {
        "fields": {
            "email": {"stringValue": email},
            "perfil": {"stringValue": perfil}
        }
    }
    requests.post(url, headers=headers, json=payload)


def logout_view(request):
    """Destroi a sessão do usuário e redireciona para a página de login.
    Aceita apenas POST para prevenir logout acidental ao voltar pela seta.
    """
    # Aceitar apenas POST para prevenir logout acidental
    if request.method != 'POST':
        return redirect('medify_web:dashboard_paciente')
    try:
        # limpar todas as chaves da sessão relacionadas ao auth
        keys = ['idToken', 'email', 'localId', 'perfil', 'needs_profile_completion']
        for k in keys:
            if k in request.session:
                del request.session[k]
        # também opcional: flush completa
        request.session.flush()
    except Exception:
        # garantir que pelo menos session.flush seja chamado
        try:
            request.session.flush()
        except Exception:
            pass
    # Garantir flush e retornar redirect com cabeçalhos no-cache para evitar
    # que o navegador mostre páginas autenticadas via cache ao usar o Back.
    try:
        request.session.flush()
    except Exception:
        try:
            request.session.clear()
        except Exception:
            pass
    resp = redirect('medify_web:auth')
    # cabeçalhos que instruem o navegador a não usar cache
    resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp['Pragma'] = 'no-cache'
    resp['Expires'] = '0'
    try:
        resp.delete_cookie(settings.SESSION_COOKIE_NAME)
    except Exception:
        pass
    return resp
