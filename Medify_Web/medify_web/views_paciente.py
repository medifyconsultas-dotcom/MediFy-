# View para enviar e-mail de redefinição de senha
def enviar_redefinicao_senha(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        if not email:
            from django.contrib import messages
            messages.error(request, 'E-mail não informado.')
            return redirect('medify_web:perfilPaciente')
        from .firebase_services import enviar_email_redefinicao
        resp = enviar_email_redefinicao(email)
        from django.contrib import messages
        if resp.get('email'):
            messages.success(request, 'E-mail de redefinição enviado! Verifique sua caixa de entrada.')
        else:
            erro = resp.get('error', {}).get('message', 'Erro ao enviar e-mail.')
            messages.error(request, f'Erro: {erro}')
        return redirect('medify_web:perfilPaciente')
from django.shortcuts import render, redirect
import requests
import datetime
from django.contrib import messages
from django.http import JsonResponse
import json
import os
from django.conf import settings

API_KEY_FIREBASE = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
PROJECT_ID = "medify-401a8"

# Página "Meu Perfil"
def perfilPaciente(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_paciente
    paciente = obter_paciente(uid)

    if request.method == 'POST':
        nome = request.POST.get('nome')
        telefone = request.POST.get('telefone')
        endereco = request.POST.get('endereco')
        plano = request.POST.get('plano')
        updates = {}
        if nome is not None:
            updates['nome'] = nome
        if telefone is not None:
            updates['telefone'] = telefone
        if endereco is not None:
            updates['endereco'] = endereco
        if plano is not None:
            updates['plano'] = plano
        # If a file was submitted in the same form under 'foto', save it and include in payload
        try:
            photo = request.FILES.get('foto') if hasattr(request, 'FILES') else None
            if photo:
                from .upload_utils import salvar_foto
                success, result = salvar_foto(photo, 'pacientes', uid)
                if success:
                    updates['foto'] = result
                    saved_media = result
                else:
                    # result contém mensagem de erro
                    messages.warning(request, f'Aviso ao salvar foto: {result}')
        except Exception as e:
            messages.warning(request, f'Falha ao salvar foto: {e}')
        from .firebase_services import atualizar_paciente
        sucesso = atualizar_paciente(uid, updates)
        # if DB update failed and we saved a media file, attempt cleanup
        if not sucesso and updates.get('foto'):
            try:
                from .upload_utils import delete_media_by_url
                delete_media_by_url(updates.get('foto'))
            except Exception:
                pass
        from django.contrib import messages
        if sucesso:
            messages.success(request, 'Perfil atualizado com sucesso!')
        else:
            messages.error(request, 'Erro ao atualizar perfil. Tente novamente.')
        return redirect('medify_web:perfilPaciente')

    session_user_id = request.session.get('localId') or request.session.get('uid')
    return render(request, 'Paciente/perfilPaciente.html', {'paciente': paciente, 'session_user_id': session_user_id})


def upload_profile_photo(request):
    """AJAX endpoint: accepts JSON {image_url: ...} and saves it to the paciente document.
    Requires authenticated session (localId/uid).
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'method_not_allowed'}, status=405)

    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return JsonResponse({'error': 'not_authenticated'}, status=401)

    # 1) If a file was uploaded via multipart/form-data under 'photo'
    photo = request.FILES.get('photo') if hasattr(request, 'FILES') else None
    if photo:
        # Build destination path: MEDIA_ROOT/pacientes/<uid>_<timestamp>.<ext>
        try:
            ext = os.path.splitext(photo.name)[1] or ''
            ts = int(datetime.datetime.utcnow().timestamp())
            subdir = os.path.join(settings.MEDIA_ROOT, 'pacientes')
            os.makedirs(subdir, exist_ok=True)
            filename = f"{uid}_{ts}{ext}"
            dest_path = os.path.join(subdir, filename)
            # Write file in chunks
            with open(dest_path, 'wb+') as f:
                for chunk in photo.chunks():
                    f.write(chunk)

            # The URL/path to store in the DB (relative URL)
            media_url = settings.MEDIA_URL.rstrip('/') + f"/pacientes/{filename}"
            from .firebase_services import atualizar_paciente
            ok = atualizar_paciente(uid, {'foto': media_url})
            if ok:
                return JsonResponse({'ok': True, 'url': media_url})
            else:
                return JsonResponse({'ok': False, 'error': 'db_update_failed'}, status=500)
        except Exception as e:
            return JsonResponse({'error': f'file_save_error: {str(e)}'}, status=500)

    # 2) Fallback: accept JSON payload with image_url
    try:
        payload = json.loads(request.body.decode('utf-8'))
        image_url = payload.get('image_url')
    except Exception:
        return JsonResponse({'error': 'invalid_payload'}, status=400)

    if not image_url:
        return JsonResponse({'error': 'no_image_url'}, status=400)

    try:
        from .firebase_services import atualizar_paciente
        ok = atualizar_paciente(uid, {'foto': image_url})
        if ok:
            return JsonResponse({'ok': True, 'url': image_url})
        else:
            return JsonResponse({'ok': False}, status=500)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Dashboard do paciente: mostra paciente e médicos
def dashboard_paciente(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_paciente, listar_profissionais, listar_medicos_clinicas, listar_consultas_paciente, listar_consultas_por_nome, listar_consultas_completas_paciente, listar_clinicas
    paciente_data = obter_paciente(uid)
    
    if not paciente_data or not paciente_data.get('nome'):
        return render(request, 'Paciente/dashboardPaciente.html', {
            'paciente': {'nome': 'Usuário não encontrado'},
            'medicos': [],
            'profissionais': [],
            'clinicas': []
        })

    paciente = {
        'nome': paciente_data.get('nome'),
        'foto': paciente_data.get('foto') or paciente_data.get('fotoURL') or paciente_data.get('photo') or paciente_data.get('avatar_url') or '',
    }
    profissionais = listar_profissionais()
    medicos = listar_medicos_clinicas()
    clinicas = listar_clinicas()

    # Combine all doctors from professionals and clinics
    all_medicos = profissionais + medicos
    # Ensure every medico has an 'especialidade' so template grouping shows them
    # Also add clinic address for clinic doctors
    # Ensure all medico dicts have foto fields (even if empty) to avoid template errors
    for m in all_medicos:
        if not m.get('especialidade'):
            m['especialidade'] = 'Geral'
        # Garantir que campos de foto existam (mesmo que vazios) para evitar erros no template
        if 'foto' not in m:
            m['foto'] = ''
        if 'fotoURL' not in m:
            m['fotoURL'] = ''
        if 'avatar_url' not in m:
            m['avatar_url'] = ''
        # Se for médico de clínica, adicionar endereço da clínica
        if m.get('idClinica') or m.get('clinica_uid') or m.get('clinica'):
            clinica_id = m.get('idClinica') or m.get('clinica_uid') or m.get('clinica')
            for clinica in clinicas:
                if clinica.get('id') == clinica_id or clinica.get('uid') == clinica_id:
                    m['clinica_endereco'] = clinica.get('endereco', '')
                    break

    medicos_especialidade = all_medicos

    # Compute patient's upcoming and historical consultas
    from .firebase_services import listar_consultas_paciente
    proximas_consultas = []
    consultas_paciente = []
    try:
        paciente_full = obter_paciente(uid)
        consultas_paciente = listar_consultas_completas_paciente(paciente_uid=uid, paciente_email=(paciente_full.get('email') if paciente_full else None), paciente_nome=(paciente_full.get('nome') if paciente_full else None)) or []
        now = datetime.datetime.utcnow()
        upcoming = []
        historico = []
        for c in consultas_paciente:
            try:
                data_str = c.get('data')
                hora_str = c.get('hora')
                status = c.get('status', '').lower()
                if not data_str or not hora_str:
                    continue
                dt = datetime.datetime.fromisoformat(f"{data_str}T{hora_str}")
                # Upcoming: status Agendada and future date
                if status == 'agendada' and dt >= now:
                    upcoming.append((dt, c))
                # Histórico: status Concluída, Cancelada, or past date
                elif status in ['concluída', 'cancelada'] or dt < now:
                    historico.append((dt, c))
            except Exception:
                continue
        if upcoming:
            upcoming.sort(key=lambda x: x[0])
            from .firebase_services import obter_profissional, obter_clinica, db
            # OTIMIZAÇÃO: Batch load de clínicas e profissionais para evitar N+1 queries
            clinicas_cache = {}
            profissionais_cache = {}
            funcionarios_cache = {}
            
            # Coletar todos os UIDs necessários primeiro
            clinica_ids = set()
            profissional_uids = set()
            for dt, c in upcoming[:3]:
                profissional_uid = c.get('profissional_uid') or c.get('id_profissional')
                if profissional_uid:
                    profissional_uids.add(profissional_uid)
                    id_clinica = c.get('id_clinica') or c.get('clinica_uid') or c.get('clinica')
                    if id_clinica:
                        clinica_ids.add(id_clinica)
            
            # Batch load clínicas
            for clinica_id in clinica_ids:
                try:
                    clinicas_cache[clinica_id] = obter_clinica(clinica_id)
                except Exception:
                    pass
            
            # Batch load profissionais autônomos
            for prof_uid in profissional_uids:
                try:
                    profissionais_cache[prof_uid] = obter_profissional(prof_uid)
                except Exception:
                    pass
                
                # Batch load funcionários
                try:
                    funcionario_doc = db.collection('funcionarios').document(prof_uid).get()
                    if funcionario_doc.exists:
                        funcionarios_cache[prof_uid] = funcionario_doc.to_dict()
                except Exception:
                    pass
            
            # Agora processar consultas usando o cache (sem queries adicionais)
            for dt, c in upcoming[:3]:
                profissional_uid = c.get('profissional_uid') or c.get('id_profissional')
                endereco = ''
                telefone = ''
                
                # Try to get professional/clinic info from cache
                if profissional_uid:
                    # Check if it's a clinic employee (funcionario)
                    id_clinica = c.get('id_clinica') or c.get('clinica_uid') or c.get('clinica')
                    if id_clinica and id_clinica in clinicas_cache:
                        try:
                            # Get clinic address and phone from cache
                            clinica = clinicas_cache[id_clinica]
                            if clinica:
                                endereco = clinica.get('endereco', '')
                                telefone = clinica.get('telefone', '')
                            # Try to get employee phone from funcionarios cache
                            if profissional_uid in funcionarios_cache:
                                funcionario_data = funcionarios_cache[profissional_uid]
                                if funcionario_data and funcionario_data.get('telefone'):
                                    telefone = funcionario_data.get('telefone')
                        except Exception:
                            pass
                    else:
                        # It's an autonomous professional - check cache
                        if profissional_uid in profissionais_cache:
                            profissional = profissionais_cache[profissional_uid]
                            if profissional:
                                endereco = profissional.get('endereco', '')
                                telefone = profissional.get('telefone', '')
                
                # Format date to Brazilian format (DD/MM/YYYY)
                data_br = c.get('data', '')
                if data_br and len(data_br) == 10:
                    try:
                        # Assume format is YYYY-MM-DD
                        parts = data_br.split('-')
                        if len(parts) == 3:
                            data_br = f"{parts[2]}/{parts[1]}/{parts[0]}"
                    except Exception:
                        pass
                
                proximas_consultas.append({
                    'id': c.get('id'),
                    'medico': c.get('profissional_nome') or c.get('profissional_uid'),
                    'profissional_uid': profissional_uid,
                    'data': data_br,
                    'hora': c.get('hora'),
                    'endereco': endereco,
                    'telefone': telefone
                })
        historico_consultas = [c for dt, c in sorted(historico, key=lambda x: x[0], reverse=True)]
    except Exception:
        proximas_consultas = []
        historico_consultas = []

    # allow debug viewing when ?debug=1 is set
    show_debug = request.GET.get('debug') == '1'
    session_user_id = request.session.get('localId') or request.session.get('uid')

    return render(request, 'Paciente/dashboardPaciente.html', {
        'paciente': paciente,
        'medicos_especialidade': medicos_especialidade,
        'medicos': medicos,
        'profissionais': profissionais,
        'clinicas': clinicas,
        'proxima_consulta': proximas_consultas[0] if proximas_consultas else None,
        'proximas_consultas': proximas_consultas,
        'consultas_paciente_raw': consultas_paciente,
        'show_debug_consultas': show_debug,
        'session_user_id': session_user_id,
        'historico_consultas': historico_consultas
    })


# View for agenda/history
def ver_agenda(request):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_paciente, listar_consultas_completas_paciente
    from .debug_firebase import check_patient_consultations
    import os
    
    # Run debug checks only in development
    if os.getenv('DJANGO_DEBUG', 'False').lower() == 'true':
        check_patient_consultations(uid)
    
    paciente_full = obter_paciente(uid)
    consultas = listar_consultas_completas_paciente(
        paciente_uid=uid, 
        paciente_email=(paciente_full.get('email') if paciente_full else None),
        paciente_nome=(paciente_full.get('nome') if paciente_full else None)
    ) or []
    
    # (debug prints removed)
    
    # Sort consultas by date and time (most recent first)
    sorted_consultas = []
    try:
        for c in consultas:
            data_str = c.get('data')
            hora_str = c.get('hora')
            if data_str and hora_str:
                dt = datetime.datetime.fromisoformat(f"{data_str}T{hora_str}")
                sorted_consultas.append((dt, c))
        sorted_consultas.sort(key=lambda x: x[0], reverse=True)
    except Exception as e:
        print(f"Debug: Error sorting consultas - {e}")
        pass
    
    # Extract just the consultations after sorting
    consultas_ordenadas = [c for dt, c in sorted_consultas]

    session_user_id = request.session.get('localId') or request.session.get('uid')
    
    # OTIMIZAÇÃO: Batch load de clínicas e profissionais para evitar N+1 queries
    from .firebase_services import obter_profissional, obter_clinica, db
    clinicas_cache = {}
    profissionais_cache = {}
    funcionarios_cache = {}
    
    # Coletar todos os UIDs necessários primeiro
    clinica_ids = set()
    profissional_uids = set()
    for c in consultas_ordenadas:
        profissional_uid = c.get('profissional_uid') or c.get('id_profissional')
        if profissional_uid:
            profissional_uids.add(profissional_uid)
            id_clinica = c.get('id_clinica') or c.get('clinica_uid') or c.get('clinica')
            if id_clinica:
                clinica_ids.add(id_clinica)
    
    # Batch load clínicas
    for clinica_id in clinica_ids:
        try:
            clinicas_cache[clinica_id] = obter_clinica(clinica_id)
        except Exception:
            pass
    
    # Batch load profissionais autônomos
    for prof_uid in profissional_uids:
        try:
            profissionais_cache[prof_uid] = obter_profissional(prof_uid)
        except Exception:
            pass
        
        # Batch load funcionários
        try:
            funcionario_doc = db.collection('funcionarios').document(prof_uid).get()
            if funcionario_doc.exists:
                funcionarios_cache[prof_uid] = funcionario_doc.to_dict()
        except Exception:
            pass
    
    # Agora processar consultas usando o cache (sem queries adicionais)
    formatted_consultas = []
    for c in consultas_ordenadas:
        profissional_uid = c.get('profissional_uid') or c.get('id_profissional')
        profissional_nome = c.get('profissional_nome') or c.get('nm_profissional')
        endereco = ''
        telefone = ''
        
        # Try to get professional/clinic info from cache
        if profissional_uid:
            # Check if it's a clinic employee (funcionario)
            id_clinica = c.get('id_clinica') or c.get('clinica_uid') or c.get('clinica')
            if id_clinica and id_clinica in clinicas_cache:
                try:
                    # Get clinic address and phone from cache
                    clinica = clinicas_cache[id_clinica]
                    if clinica:
                        endereco = clinica.get('endereco', '')
                        telefone = clinica.get('telefone', '')
                    # Try to get employee phone from funcionarios cache
                    if profissional_uid in funcionarios_cache:
                        funcionario_data = funcionarios_cache[profissional_uid]
                        if funcionario_data and funcionario_data.get('telefone'):
                            telefone = funcionario_data.get('telefone')
                except Exception:
                    pass
            else:
                # It's an autonomous professional - check cache
                if profissional_uid in profissionais_cache:
                    profissional = profissionais_cache[profissional_uid]
                    if profissional:
                        endereco = profissional.get('endereco', '')
                        telefone = profissional.get('telefone', '')
        
        # Format date to Brazilian format (DD/MM/YYYY)
        data_br = c.get('data', '')
        if data_br and len(data_br) == 10:
            try:
                # Assume format is YYYY-MM-DD
                parts = data_br.split('-')
                if len(parts) == 3:
                    data_br = f"{parts[2]}/{parts[1]}/{parts[0]}"
            except Exception:
                pass
        
        formatted = {
            'profissional_nome': profissional_nome or profissional_uid,
            'profissional_uid': profissional_uid,
            'data': data_br,
            'hora': c.get('hora'),
            'status': c.get('status', 'Agendada'),  # Default to Agendada if no status
            'id': c.get('id'),
            'endereco': endereco,
            'telefone': telefone
        }
        formatted_consultas.append(formatted)

    # Prepare context for rendering (debug disabled)
    context = {
        'consultas_paciente_raw': formatted_consultas,
        'show_debug_consultas': False,
        'session_user_id': session_user_id,
        'total_consultas': len(formatted_consultas)
    }

    return render(request, 'Paciente/verAgenda.html', context)

def paciente_agenda_events(request):
    """Retorna JSON com eventos para o paciente logado (consultas e slots disponíveis)."""
    from django.http import JsonResponse
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return JsonResponse({'error': 'Não autenticado'}, status=401)

    from .firebase_services import listar_consultas_completas_paciente, listar_horarios_profissional
    eventos = []
    try:
        # Use the "completas" aggregator so events include consultas from
        # top-level collections and subcollections (consultas, consultas_clinicas, consultas_autonomos)
        consultas = listar_consultas_completas_paciente(paciente_uid=uid) or []
        for c in consultas:
            data = c.get('data')
            hora = c.get('hora')
            if not data:
                continue
            start = f"{data}T{hora}" if hora else data
            title = c.get('profissional_nome') or c.get('profissional_uid') or 'Consulta'
            eventos.append({'id': c.get('id'), 'title': title, 'start': start, 'extendedProps': {'hora': hora, 'local': c.get('local')}})
    except Exception:
        pass

    # Optionally include available slots from profissionais where the patient has appointments? Skipped for privacy.

    return JsonResponse(eventos, safe=False)


# View to visualize a patient's basic info and their prontuários (for professionals)
def visualizar_paciente(request, paciente_uid):
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_paciente, db
    paciente = obter_paciente(paciente_uid) or {}

    prontuarios = []
    try:
        coll = db.collection('pacientes').document(paciente_uid).collection('prontuarios').stream()
        for doc in coll:
            try:
                data = doc.to_dict() or {}
            except Exception:
                data = {}
            data['id'] = getattr(doc, 'id', None)
            prontuarios.append(data)
    except Exception:
        prontuarios = []

    return render(request, 'Profissional/visualizarPaciente.html', {
        'paciente': paciente,
        'paciente_uid': paciente_uid,
        'prontuarios': prontuarios
    })