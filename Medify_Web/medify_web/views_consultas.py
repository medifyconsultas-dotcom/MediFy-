from django.shortcuts import render, redirect
from django.urls import reverse
import requests
import datetime
from datetime import date
from django.contrib import messages

API_KEY_FIREBASE = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
PROJECT_ID = "medify-401a8"


def dashboard_clinica(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        # Se não está logado, redireciona para login
        return redirect('medify_web:auth')
    else:
         return render(request, 'Profissional/dashboardProfissional.html')
   

# View para tela de agendamento geral (lista de médicos)
def consultaGeral(request, medico_id=None):
    from .firebase_services import listar_profissionais, listar_medicos_clinicas, obter_paciente
    profissionais = listar_profissionais()
    medicos_clinica = listar_medicos_clinicas()
    # combine professionals and clinic doctors so both appear in the general scheduling
    medicos = profissionais + medicos_clinica

    # allow preselecting medico via query param (used by remarcar redirect)
    try:
        medico_q = request.GET.get('medico') if request.method == 'GET' else None
        if not medico_id and medico_q:
            medico_id = medico_q
    except Exception:
        pass

    if request.method == 'POST':
        # Verificar autenticação antes de prosseguir
        paciente_id = request.session.get('localId') or request.session.get('uid')
        if not paciente_id:
            messages.error(request, 'Sua sessão expirou. Por favor, faça login novamente.')
            return redirect('medify_web:login')
            
        medico_id_post = request.POST.get('medico')
        # medico_id_final will be determined after possibly loading the old consulta so we can reuse it
        medico_id_final = None
        # read incoming fields (may be None if patient didn't change them)
        incoming_data = request.POST.get('data')
        incoming_hora = request.POST.get('hora')
        # If the user arrived here via 'remarcar', the original consulta id may be in a hidden input
        reschedule_from = request.POST.get('reschedule_from')
        incoming_obs = request.POST.get('obs')
        # If rescheduling, try to load the original consulta and use its values as defaults
        old_consulta = None
        if reschedule_from:
            try:
                from .firebase_services import obter_consulta
                old_consulta = obter_consulta(reschedule_from)
            except Exception:
                old_consulta = None

        # prefer incoming values, otherwise fall back to the old consulta's values (if present)
        data = incoming_data or (old_consulta.get('data') if old_consulta else None)
        hora = incoming_hora or (old_consulta.get('hora') if old_consulta else None)
        obs = incoming_obs if incoming_obs is not None else (old_consulta.get('obs') if old_consulta else None)
        # determine which professional to use: incoming selection > url param > old consulta
        medico_id_final = medico_id_post or medico_id or (old_consulta.get('profissional_uid') if old_consulta else None)
        # try to enrich consulta with patient and professional names/specialty
        # firebase_services now distinguishes clinic vs autonomo consultations
        from .firebase_services import criar_consulta_clinica, criar_consulta_autonomo, marcar_horario_reservado
        paciente_nome = None
        try:
            paciente_doc = obter_paciente(paciente_id)
            paciente_nome = paciente_doc.get('nome') if paciente_doc else None
        except Exception:
            paciente_nome = None

        # find selected medico in the combined list
        medico_selecionado = None
        for m in medicos:
            if str(m.get('uid', '')) == str(medico_id_final) or str(m.get('id', '')) == str(medico_id_final):
                medico_selecionado = m
                break

        # If we couldn't find the medico in the combined list, try to fetch professional by uid
        if not medico_selecionado and medico_id_final:
            try:
                from .firebase_services import obter_profissional
                prof_doc = obter_profissional(medico_id_final)
                if prof_doc and prof_doc.get('nome'):
                    medico_selecionado = {
                        'uid': medico_id_final,
                        'id': medico_id_final,
                        'nome': prof_doc.get('nome'),
                        'especialidade': prof_doc.get('especialidade') if prof_doc.get('especialidade') else None,
                    }
            except Exception:
                medico_selecionado = None

        # fallback: use the old consulta's professional name if available (reschedule)
        if not medico_selecionado and old_consulta and old_consulta.get('profissional_nome'):
            medico_selecionado = {
                'uid': old_consulta.get('profissional_uid') or '',
                'id': old_consulta.get('profissional_uid') or '',
                'nome': old_consulta.get('profissional_nome'),
                'especialidade': old_consulta.get('especialidade')
            }

        # determine professional name robustly
        profissional_nome = None
        if medico_selecionado and medico_selecionado.get('nome'):
            profissional_nome = medico_selecionado.get('nome')
        else:
            # try to fetch from profissionais collection
            try:
                from .firebase_services import obter_profissional
                prof_check = obter_profissional(medico_id_final) if medico_id_final else None
                if prof_check and prof_check.get('nome'):
                    profissional_nome = prof_check.get('nome')
            except Exception:
                profissional_nome = None
        # fallback to old consulta's professional name
        if not profissional_nome and old_consulta and old_consulta.get('profissional_nome'):
            profissional_nome = old_consulta.get('profissional_nome')
        # final fallback: show id to avoid None
        if not profissional_nome:
            profissional_nome = medico_id_final

        consulta = {
            'paciente_uid': paciente_id,
            'paciente_nome': paciente_nome,
            'paciente_email': request.session.get('email'),
            'profissional_uid': medico_id_final,
            'profissional_nome': profissional_nome,
            'especialidade': medico_selecionado.get('especialidade') if medico_selecionado else None,
            'local': medico_selecionado.get('clinica') if medico_selecionado and medico_selecionado.get('clinica') else medico_selecionado.get('local') if medico_selecionado else None,
            'data': data,
            'hora': hora,
            'obs': obs,
            'created_at': datetime.datetime.utcnow().isoformat() + 'Z'
        }
        # escolher o criador apropriado: se o profissional pertence a uma clínica, use criar_consulta_clinica
        clinica_uid = None
        clinica_nome = None
        if medico_selecionado:
            # vários nomes possíveis para o campo de clínica dependendo de como foi salvo
            clinica_uid = medico_selecionado.get('clinica_uid') or medico_selecionado.get('clinica_id') or medico_selecionado.get('clinica')
            clinica_nome = medico_selecionado.get('clinica_nome') or medico_selecionado.get('clinica') or medico_selecionado.get('local')
        else:
            # If no medico object found in current lists, fall back to values from the old consulta (when rescheduling)
            if old_consulta:
                clinica_uid = old_consulta.get('clinica_uid') or old_consulta.get('clinica')
                clinica_nome = old_consulta.get('clinica_nome') or old_consulta.get('local')

        dados_consulta = {
            'paciente_uid': paciente_id,
            'paciente_nome': paciente_nome or 'Paciente',  # Garantir nome não nulo
            'paciente_email': request.session.get('email', ''),
            'profissional_uid': medico_id_final,
            'profissional_nome': profissional_nome or 'Profissional',  # Garantir nome não nulo
            'especialidade': medico_selecionado.get('especialidade') if medico_selecionado else 'Geral',
            'local': clinica_nome or (medico_selecionado.get('local') if medico_selecionado else ''),
            'clinica_uid': clinica_uid,
            'clinica_nome': clinica_nome,
            'data': data,
            'hora': hora,
            'obs': obs if obs else '',
            'created_at': datetime.datetime.utcnow().isoformat() + 'Z',
            'status': 'Agendada'  # Garantir status explícito
        }

        try:
            # Validar campos obrigatórios antes de prosseguir
            if not all([dados_consulta['paciente_uid'], dados_consulta['profissional_uid'], 
                       dados_consulta['data'], dados_consulta['hora']]):
                messages.error(request, 'Dados incompletos para agendamento. Verifique todos os campos.')
                return redirect('medify_web:consultaGeral')
            # Debug: show key values when creating consulta (temporary)
            try:
                dbg_line = f"DEBUG criar_consulta: medico_id_final={medico_id_final} profissional_nome={dados_consulta.get('profissional_nome')} medico_selecionado_exists={bool(medico_selecionado)} old_prof_name={old_consulta.get('profissional_nome') if old_consulta else None}\n"
                with open('remarcar_debug.log', 'a', encoding='utf-8') as _f:
                    _f.write(dbg_line)
            except Exception:
                pass
            
            if clinica_uid:
                new_doc_id = criar_consulta_clinica(dados_consulta)
                if not new_doc_id:
                    raise Exception("Falha ao criar consulta na clínica")
            else:
                new_doc_id = criar_consulta_autonomo(dados_consulta)
                if not new_doc_id:
                    raise Exception("Falha ao criar consulta com profissional autônomo")
            # also add into paciente and profissional subcollections for fast lookup
            try:
                from .firebase_services import adicionar_consulta_a_paciente, adicionar_consulta_a_profissional
                # ao adicionar nas subcoleções usamos 'dados_consulta' (mais completo)
                if paciente_id:
                    adicionar_consulta_a_paciente(paciente_id, dados_consulta, consulta_id=new_doc_id)
                    # verify write
                    from .firebase_services import listar_consultas_paciente
                    tries = 0
                    while tries < 3:
                        try:
                            found = listar_consultas_paciente(paciente_id)
                            if any(d.get('id') == new_doc_id for d in found):
                                break
                        except Exception:
                            pass
                        tries += 1
                if dados_consulta.get('profissional_uid'):
                    adicionar_consulta_a_profissional(dados_consulta.get('profissional_uid'), dados_consulta, consulta_id=new_doc_id)
                    # verify write
                    from .firebase_services import listar_consultas_profissional
                    tries = 0
                    while tries < 3:
                        try:
                            found = listar_consultas_profissional(consulta.get('profissional_uid'))
                            if any(d.get('id') == new_doc_id for d in found):
                                break
                        except Exception:
                            pass
                        tries += 1
            except Exception:
                # non-fatal if subcollection writes fail
                pass
            # Marca o horário como reservado (não falha o fluxo caso não atualize registros — apenas log)
            try:
                reserved_count = marcar_horario_reservado(medico_id_final, data, hora)
                try:
                    with open('remarcar_debug.log', 'a', encoding='utf-8') as _f:
                        _f.write(f"marcar_horario_reservado updated={reserved_count} for {medico_id_final} {data} {hora}\n")
                except Exception:
                    pass
                if not reserved_count or reserved_count == 0:
                    # warn but continue — fallback free/cleanup will be attempted for old consulta
                    try:
                        with open('remarcar_debug.log', 'a', encoding='utf-8') as _f:
                            _f.write(f"WARNING: marcar_horario_reservado returned 0 for {medico_id_final} {data} {hora}\n")
                    except Exception:
                        pass
            except Exception as e:
                try:
                    with open('remarcar_debug.log', 'a', encoding='utf-8') as _f:
                        _f.write(f"ERROR calling marcar_horario_reservado: {str(e)}\n")
                except Exception:
                    pass
                
            # Se for remarcação, remove a consulta antiga
            if reschedule_from:
                try:
                    from .firebase_services import obter_consulta, deletar_consulta_completa
                    old = obter_consulta(reschedule_from)
                    if old:
                        removed = False
                        try:
                            removed = deletar_consulta_completa(reschedule_from)
                        except Exception as e:
                            removed = False
                            try:
                                with open('remarcar_debug.log', 'a', encoding='utf-8') as f:
                                    f.write(f"Exception during deletar_consulta_completa for {reschedule_from}: {str(e)}\n")
                            except Exception:
                                pass
                        # Regardless of deletar_consulta_completa result, attempt to free old horario explicitly
                        try:
                            prof_old = old.get('profissional_uid')
                            data_old = old.get('data')
                            hora_old = old.get('hora')
                            if prof_old and data_old and hora_old:
                                from .firebase_services import marcar_horario_disponivel
                                freed = marcar_horario_disponivel(prof_old, data_old, hora_old)
                                try:
                                    with open('remarcar_debug.log', 'a', encoding='utf-8') as f:
                                        f.write(f"marcar_horario_disponivel attempted for {prof_old} {data_old} {hora_old}, freed={freed}\n")
                                except Exception:
                                    pass
                        except Exception:
                            pass
                except Exception as e:
                    # Logga o erro mas não interrompe o fluxo
                    try:
                        with open('remarcar_debug.log', 'a', encoding='utf-8') as f:
                            f.write(f"Erro ao remover consulta antiga {reschedule_from}: {str(e)}\n")
                    except:
                        pass
            # OTIMIZAÇÃO: Invalidar cache de consultas para que apareça imediatamente
            try:
                from .firebase_services import invalidar_cache_consultas_paciente
                invalidar_cache_consultas_paciente(paciente_id)
            except Exception:
                pass
            
            # Não usar messages.success para evitar avisos no perfil
            # Redirecionar com parâmetro para mostrar aviso bonito no dashboard
            return redirect(reverse('medify_web:dashboard_paciente') + '?consulta_agendada=1')

        except Exception as e:
            # Log do erro completo para debug
            import traceback, sys
            tb = traceback.format_exc()
            try:
                with open('remarcar_debug.log', 'a', encoding='utf-8') as _f:
                    _f.write('EXCEPTION during agendar:\n')
                    _f.write(tb + '\n')
            except Exception:
                pass

            # Verifica se é erro de sessão
            if not request.session.get('localId') and not request.session.get('uid'):
                messages.error(request, 'Sua sessão expirou. Por favor, faça login novamente.')
                return redirect('medify_web:login')
            
            # Outro tipo de erro - não usar messages para evitar avisos no perfil
            # Log do erro para debug, mas não exibir mensagem ao usuário
            return redirect(reverse('medify_web:dashboard_paciente') + '?erro_agendamento=1')    # For each medico, include available horarios (if any)
    from .firebase_services import listar_horarios_profissional
    for m in medicos:
        # normalize id/uid so templates can safely access either
        uid = m.get('uid') or m.get('id')
        if uid:
            m['uid'] = uid
            m['id'] = uid
        else:
            # ensure keys exist to avoid template lookup errors
            m.setdefault('uid', '')
            m.setdefault('id', '')

        # ensure minimal fields exist
        m.setdefault('nome', '')
        if not m.get('especialidade'):
            m['especialidade'] = 'Geral'

        if uid:
            try:
                horarios = listar_horarios_profissional(uid)
            except Exception:
                horarios = []
        else:
            horarios = []

        # only keep available ones
        m['horarios'] = [h for h in horarios if h.get('disponivel', True)]

    # provide a JSON-safe version of medicos for client-side consumption
    import json
    medicos_safe = []
    for m in medicos:
        med_copy = {
            'uid': m.get('uid', ''),
            'id': m.get('id', ''),
            'nome': m.get('nome', ''),
            'especialidade': m.get('especialidade', ''),
            'horarios': m.get('horarios', [])
        }
        medicos_safe.append(med_copy)

    # prepare context for scheduling pages (client-side JS consumes medicos_json)
    import json as _json
    medicos_json = _json.dumps(medicos_safe)
    ctx = {
        'medicos_json': medicos_json,
        'medicos': medicos,
        'medicos_safe': medicos_safe
    }

    # If caller passed reschedule_from via GET (remarcar redirect), include the original consulta in the context
    try:
        res_from_get = request.GET.get('reschedule_from') if request.method == 'GET' else None
        if res_from_get:
            from .firebase_services import obter_consulta
            try:
                old = obter_consulta(res_from_get)
            except Exception:
                old = None
            ctx['old_consulta'] = old
            ctx['reschedule_from'] = res_from_get
    except Exception:
        pass
    # Also provide JSON-serialized old_consulta for client-side prefill
    try:
        import json as _json
        ctx['old_consulta_json'] = _json.dumps(ctx.get('old_consulta')) if ctx.get('old_consulta') else 'null'
    except Exception:
        ctx['old_consulta_json'] = 'null'

    # If a specific medico_id was passed, render the medico-specific booking page
    if medico_id:
        # find medico details and its horarios to populate the medico-specific page
        selected = None
        for m in medicos:
            if str(m.get('uid', '')) == str(medico_id) or str(m.get('id', '')) == str(medico_id):
                selected = m
                break
        horarios = []
        try:
            from .firebase_services import listar_horarios_profissional
            if selected and selected.get('uid'):
                horarios = listar_horarios_profissional(selected.get('uid')) or []
        except Exception:
            horarios = []

        # If caller provided a reschedule_from in GET, include old consulta so template can prefill selection
        reschedule_from_get = None
        try:
            reschedule_from_get = request.GET.get('reschedule_from') if request.method == 'GET' else None
        except Exception:
            reschedule_from_get = None
        old = None
        if reschedule_from_get:
            try:
                from .firebase_services import obter_consulta
                old = obter_consulta(reschedule_from_get)
            except Exception:
                old = None
        try:
            import json as _json
            old_json = _json.dumps(old) if old else 'null'
        except Exception:
            old_json = 'null'
        # Data de hoje no formato YYYY-MM-DD para o input date
        hoje = date.today().strftime('%Y-%m-%d')
        
        return render(request, 'Paciente/consultaMedico.html', {
            'medico': selected or {'uid': medico_id, 'nome': 'Médico'},
            'horarios': horarios,
            'old_consulta': old,
            'old_consulta_json': old_json,
            'reschedule_from': reschedule_from_get,
            'hoje': hoje
        })

    # Otherwise render the general booking page
    return render(request, 'Paciente/consultaGeral.html', ctx)


def debug_problematic_consultas(request):
    """Rota de debug (acesso interno) que lista consultas top-level que estão sem paciente_uid ou sem paciente_nome,
    e também examina subcoleções dos profissionais para documentos similares. Usa para diagnosticar dados faltantes."""
    from django.http import JsonResponse
    from .firebase_services import listar_consultas_por_email, listar_consultas_por_nome
    results = {'missing_paciente_uid': [], 'missing_paciente_nome': [], 'prof_subcollection_issues': []}
    try:
        from .firebase_services import _safe_snapshot_dict
        docs = __import__('firebase_admin').firestore.client().collection('consultas').stream()
        for doc in docs:
            sd = _safe_snapshot_dict(doc)
            if not sd:
                continue
            d = sd
            if not d.get('paciente_uid'):
                results['missing_paciente_uid'].append(d)
            if not d.get('paciente_nome'):
                results['missing_paciente_nome'].append(d)
    except Exception:
        pass

    # scan professionals' subcollections for problematic docs
    try:
        profs = __import__('firebase_admin').firestore.client().collection('profissionais').stream()
        for prof in profs:
            try:
                prid = getattr(prof, 'id', None)
                if not prid:
                    try:
                        psd = _safe_snapshot_dict(prof)
                        prid = psd.get('id') if psd else None
                    except Exception:
                        prid = None
                if not prid:
                    continue
                coll = __import__('firebase_admin').firestore.client().collection('profissionais').document(prid).collection('consultas')
                for doc in coll.stream():
                    sd = _safe_snapshot_dict(doc)
                    if not sd:
                        continue
                    d = sd | {'profissional_uid': prid}
                    if not d.get('paciente_uid') or not d.get('paciente_nome'):
                        results['prof_subcollection_issues'].append(d)
            except Exception:
                continue
    except Exception:
        pass

    return JsonResponse(results, safe=True)


def atualizar_consulta_via_ajax(request):
    """Endpoint que atualiza data/hora de uma consulta via AJAX (usado no drag/drop do calendário).
    Espera JSON: {id, data, hora}
    Retorna JSON {success: true/false, message: '...'}"""
    from django.http import JsonResponse
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método inválido'}, status=400)

    import json
    try:
        payload = json.loads(request.body.decode('utf-8'))
        consulta_id = payload.get('id')
        data = payload.get('data')
        hora = payload.get('hora')
        if not consulta_id or not data:
            return JsonResponse({'success': False, 'message': 'Dados incompletos'}, status=400)

        # ensure requester is the profissional proprietário
        uid = request.session.get('localId') or request.session.get('uid')
        from .firebase_services import obter_consulta
        consulta = obter_consulta(consulta_id)
        if not consulta:
            return JsonResponse({'success': False, 'message': 'Consulta não encontrada'}, status=404)
        if consulta.get('profissional_uid') != uid:
            return JsonResponse({'success': False, 'message': 'Não autorizado'}, status=403)

        # update consulta and optionally mark horarios (complex flows not handled here)
        from .firebase_services import atualizar_consulta
        updates = {'data': data, 'hora': hora}
        ok = atualizar_consulta(consulta_id, updates)
        if ok:
            # OTIMIZAÇÃO: Invalidar cache após atualizar
            try:
                from .firebase_services import invalidar_cache_consultas_paciente
                paciente_uid = consulta.get('paciente_uid')
                if paciente_uid:
                    invalidar_cache_consultas_paciente(paciente_uid)
            except Exception:
                pass
            return JsonResponse({'success': True, 'message': 'Consulta atualizada'})
        else:
            return JsonResponse({'success': False, 'message': 'Falha ao atualizar consulta'}, status=500)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def cancelar_consulta(request, consulta_id):
    # We want to mark the consulta as cancelled (keep record in history) instead of hard-deleting
    from .firebase_services import obter_consulta, marcar_consulta_cancelada
    if request.method != 'POST':
        return redirect('medify_web:verAgenda')

    motivo = request.POST.get('motivo')
    consulta = obter_consulta(consulta_id)
    if not consulta:
        return redirect('medify_web:verAgenda')
    try:
        ok = marcar_consulta_cancelada(consulta_id, motivo=motivo)
        # OTIMIZAÇÃO: Invalidar cache após cancelar
        try:
            from .firebase_services import invalidar_cache_consultas_paciente
            paciente_uid = consulta.get('paciente_uid')
            if paciente_uid:
                invalidar_cache_consultas_paciente(paciente_uid)
        except Exception:
            pass
        # Não exibe mensagem de sucesso/aviso para evitar poluição na tela inicial
    except Exception:
        from django.contrib import messages
        messages.error(request, 'Erro ao cancelar a consulta.')
    return redirect('medify_web:verAgenda')


def remarcar_consulta(request, consulta_id):
    # redirect to consultaGeral with preselected medico and original consulta id as query params
    from .firebase_services import obter_consulta
    consulta = obter_consulta(consulta_id)
    if not consulta:
        return redirect('medify_web:verAgenda')
    profissional_uid = consulta.get('profissional_uid')
    # include original consulta id so caller can cancel it after new booking
    return redirect(f"{request.build_absolute_uri('/paciente/agendar/')}?medico={profissional_uid}&reschedule_from={consulta_id}")


def deletar_consulta_view(request, consulta_id):
    """Permite ao paciente ou profissional dono da consulta deletar o documento por completo.
    Usa deletar_consulta_completa para remover a consulta de todos os lugares possíveis.
    """
    if request.method != 'POST':
        return redirect('medify_web:verAgenda')

    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_consulta, marcar_consulta_cancelada
    try:
        consulta = obter_consulta(consulta_id)
    except Exception:
        consulta = None

    if not consulta:
        from django.contrib import messages
        messages.error(request, 'Consulta não encontrada.')
        return redirect('medify_web:verAgenda')

    # permitir apenas paciente ou profissional associado
    paciente_uid = consulta.get('paciente_uid')
    profissional_uid = consulta.get('profissional_uid')
    if str(uid) != str(paciente_uid) and str(uid) != str(profissional_uid):
        from django.contrib import messages
        messages.error(request, 'Você não tem permissão para excluir esta consulta.')
        # se for profissional, manda para dashboard profissional
        if str(uid) == str(profissional_uid):
            return redirect('medify_web:dashboard_profissional')
        return redirect('medify_web:verAgenda')

    motivo = request.POST.get('motivo')
    try:
        ok = marcar_consulta_cancelada(consulta_id, motivo=motivo)
        # OTIMIZAÇÃO: Invalidar cache após cancelar
        try:
            from .firebase_services import invalidar_cache_consultas_paciente
            if paciente_uid:
                invalidar_cache_consultas_paciente(paciente_uid)
        except Exception:
            pass
        from django.contrib import messages
        if ok:
            messages.success(request, 'Consulta marcada como cancelada e mantida no histórico.')
        else:
            messages.warning(request, 'A tentativa de marcar como cancelada não encontrou todos os registros.')
    except Exception as e:
        from django.contrib import messages
        messages.error(request, f'Erro ao marcar consulta como cancelada: {str(e)}')

    # redireciona para a página apropriada
    if str(uid) == str(paciente_uid):
        return redirect('medify_web:dashboard_paciente')
    return redirect('medify_web:dashboard_profissional')


def deletar_todas_consultas_paciente(request):
    """Deleta (comportamento destrutivo) todas as consultas históricas do paciente logado.
    Esta ação remove os documentos usando deletar_consulta_completa().
    Requer método POST e usuário autenticado.
    """
    if request.method != 'POST':
        return redirect('medify_web:verAgenda')

    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from django.contrib import messages
    from .firebase_services import listar_consultas_completas_paciente, deletar_consulta_completa

    try:
        consultas = listar_consultas_completas_paciente(paciente_uid=uid) or []
        removed = 0
        for c in consultas:
            try:
                # skip currently agendadas (keep future appointments) - only remove histórico (concluídas/canceladas)
                status = (c.get('status') or '').lower()
                if status == 'agendada':
                    continue
                cid = c.get('id')
                if not cid:
                    continue
                # attempt hard delete
                ok = deletar_consulta_completa(cid)
                if ok:
                    removed += 1
            except Exception:
                continue
        messages.success(request, f'{removed} consultas de histórico removidas.')
    except Exception as e:
        messages.error(request, f'Erro ao remover histórico: {str(e)}')

    return redirect('medify_web:verAgenda')


def deletar_consulta_permanente(request, consulta_id):
    """Remove permanentemente (hard delete) uma consulta por id usando deletar_consulta_completa().
    Requer método POST e que o usuário seja paciente ou profissional associado.
    """
    if request.method != 'POST':
        return redirect('medify_web:verAgenda')

    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from django.contrib import messages
    from .firebase_services import obter_consulta, deletar_consulta_completa

    try:
        consulta = obter_consulta(consulta_id)
    except Exception:
        consulta = None

    if not consulta:
        messages.error(request, 'Consulta não encontrada.')
        return redirect('medify_web:verAgenda')

    paciente_uid = consulta.get('paciente_uid')
    profissional_uid = consulta.get('profissional_uid')
    # permitir apenas paciente ou profissional associado
    if str(uid) != str(paciente_uid) and str(uid) != str(profissional_uid):
        messages.error(request, 'Você não tem permissão para excluir esta consulta.')
        return redirect('medify_web:verAgenda')

    try:
        ok = deletar_consulta_completa(consulta_id)
        # OTIMIZAÇÃO: Invalidar cache após deletar
        try:
            from .firebase_services import invalidar_cache_consultas_paciente
            if paciente_uid:
                invalidar_cache_consultas_paciente(paciente_uid)
        except Exception:
            pass
        if ok:
            messages.success(request, 'Consulta excluída permanentemente.')
        else:
            messages.warning(request, 'Não foi possível excluir completamente a consulta.')
    except Exception as e:
        messages.error(request, f'Erro ao excluir: {str(e)}')
    # Redirect back depending on who performed the deletion
    if str(uid) == str(profissional_uid):
        return redirect('medify_web:historico_profissional')
    if str(uid) == str(paciente_uid):
        return redirect('medify_web:dashboard_paciente')
    return redirect('medify_web:index')


# Compatibility wrapper for URL routing: keep named view `consultaMedico` available
def consultaMedico(request, medico_id):
    return consultaGeral(request, medico_id)

