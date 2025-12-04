# views.py
from django.shortcuts import render, redirect, get_object_or_404
import requests
import datetime
from django.contrib import messages
from .firebase_services import obter_prontuario, atualizar_prontuario, excluir_prontuario, verificar_prontuario_existente

def visualizar_prontuario(request, prontuario_id):
    # Verificar autenticação
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')
    
    # Obter o prontuário
    prontuario = obter_prontuario(prontuario_id)
    if not prontuario:
        messages.error(request, 'Prontuário não encontrado.')
        return redirect('medify_web:dashboard_profissional')
    
    return render(request, 'Profissional/visualizarProntuario.html', {
        'prontuario': prontuario
    })

def editar_prontuario(request, prontuario_id):
    # Verificar autenticação
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')
    
    # Obter o prontuário existente
    prontuario = obter_prontuario(prontuario_id)
    if not prontuario:
        messages.error(request, 'Prontuário não encontrado.')
        return redirect('medify_web:dashboard_profissional')
    
    if request.method == 'POST':
        # Coletar dados do formulário
        dados_atualizados = {
            'titulo': request.POST.get('titulo'),
            'conteudo': request.POST.get('conteudo'),
            'anamnese': request.POST.get('anamnese'),
            'exame_fisico': request.POST.get('exame_fisico'),
            'diagnosticos': request.POST.get('diagnosticos'),
            'prescricoes': request.POST.get('prescricoes'),
            'alergias': request.POST.get('alergias'),
            'antecedentes': request.POST.get('antecedentes'),
            'exames_solicitados': request.POST.get('exames_solicitados'),
            'plano': request.POST.get('plano'),
            'follow_up': request.POST.get('follow_up'),
            'medicamentos': request.POST.get('medicamentos'),
            'sinais_vitais': request.POST.get('sinais_vitais'),
            'atualizado_em': datetime.datetime.utcnow().isoformat() + 'Z'
        }
        
        # Atualizar o prontuário
        if atualizar_prontuario(prontuario_id, dados_atualizados):
            messages.success(request, 'Prontuário atualizado com sucesso!')
            return redirect('medify_web:visualizar_prontuario', prontuario_id=prontuario_id)
        else:
            messages.error(request, 'Erro ao atualizar o prontuário.')
    
    return render(request, 'Profissional/criarProntuario.html', {
        'prontuario': prontuario,
        'modo_edicao': True
    })

def excluir_prontuario(request, prontuario_id):
    # Verificar autenticação
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')
    
    if request.method == 'POST':
        from .firebase_services import excluir_prontuario as excluir_prontuario_firebase
        if excluir_prontuario_firebase(prontuario_id):
            messages.success(request, 'Prontuário excluído com sucesso!')
        else:
            messages.error(request, 'Erro ao excluir o prontuário.')
        return redirect('medify_web:dashboard_profissional')
    
    return redirect('medify_web:visualizar_prontuario', prontuario_id=prontuario_id)

API_KEY_FIREBASE = "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94"
PROJECT_ID = "medify-401a8"


def criar_prontuario(request, paciente_uid=None):
    # allow professional or receptionist to create a prontuario for a patient
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    from .firebase_services import obter_paciente, adicionar_prontuario
    paciente = None
    if paciente_uid:
        paciente = obter_paciente(paciente_uid)

    # Populate agenda_consultas and pacientes_agendados from professional data
    agenda_consultas = []
    pacientes_agendados = []
    try:
        from .firebase_services import listar_consultas_profissional, db
        try:
            agenda_consultas = listar_consultas_profissional(uid) or []
        except Exception:
            agenda_consultas = []

        # Build pacientes_agendados similar to dashboard_profissional
        for c in (agenda_consultas or []):
            # show only agendadas for the quick-select list
            status = str(c.get('status') or '').lower()
            if 'agend' not in status:
                continue
            nome = c.get('paciente_nome')
            paciente_uid_c = c.get('paciente_uid')
            prontuario_id = None
            tem_prontuario = False
            if paciente_uid_c:
                try:
                    from .firebase_services import obter_paciente as _obter_paciente
                    pdoc = _obter_paciente(paciente_uid_c)
                    if pdoc:
                        nome = pdoc.get('nome')
                        # Buscar primeiro prontuário do paciente
                        try:
                            prontuarios = db.collection('pacientes').document(paciente_uid_c).collection('prontuarios').stream()
                            for prontuario in prontuarios:
                                pr_id = getattr(prontuario, 'id', None)
                                prontuario_id = pr_id
                                tem_prontuario = True
                                break
                        except Exception:
                            pass
                except Exception:
                    pass
            pacientes_agendados.append({
                'nome': nome or (paciente_uid_c or 'Paciente desconhecido'),
                'data_consulta': c.get('data') or c.get('data_consulta'),
                'hora_consulta': c.get('hora') or c.get('hora_consulta'),
                'paciente_uid': paciente_uid_c,
                'tem_prontuario': tem_prontuario,
                'prontuario_id': prontuario_id,
                'consulta_id': c.get('id')
            })
    except Exception:
        agenda_consultas = agenda_consultas or []
        pacientes_agendados = pacientes_agendados or []

    if request.method == 'POST':
        # collect clinical fields from the form
        paciente_id = request.POST.get('paciente_uid') or paciente_uid
        titulo = request.POST.get('titulo')
        conteudo = request.POST.get('conteudo')
        anamnese = request.POST.get('anamnese')
        exame_fisico = request.POST.get('exame_fisico')
        diagnosticos = request.POST.get('diagnosticos')
        prescricoes = request.POST.get('prescricoes')
        alergias = request.POST.get('alergias')
        antecedentes = request.POST.get('antecedentes')
        exames_solicitados = request.POST.get('exames_solicitados')
        plano = request.POST.get('plano')
        follow_up = request.POST.get('follow_up')
        medicamentos = request.POST.get('medicamentos')
        sinais_vitais = request.POST.get('sinais_vitais')

        now_iso = datetime.datetime.utcnow().isoformat() + 'Z'
        prontuario = {
            'titulo': titulo,
            'conteudo': conteudo,
            'anamnese': anamnese,
            'exame_fisico': exame_fisico,
            'diagnosticos': diagnosticos,
            'prescricoes': prescricoes,
            'alergias': alergias,
            'antecedentes': antecedentes,
            'exames_solicitados': exames_solicitados,
            'plano': plano,
            'follow_up': follow_up,
            'medicamentos': medicamentos,
            'sinais_vitais': sinais_vitais,
            'autor_uid': uid,
            'created_at': now_iso
        }
        try:
            adicionar_prontuario(paciente_id, prontuario)
            from django.contrib import messages
            messages.success(request, 'Prontuário criado com sucesso.')
            # redirect back to professional dashboard
            return redirect('medify_web:dashboard_profissional')
        except Exception as e:
            from django.contrib import messages
            messages.error(request, f'Erro ao criar prontuário: {str(e)}')

    # Always use the professional template for creating prontuários
    template = 'Profissional/criarProntuario.html'

    # ensure template has a prontuario dict with expected keys to avoid VariableDoesNotExist
    default_prontuario = {
        'titulo':'', 'conteudo':'', 'anamnese':'', 'exame_fisico':'', 'diagnosticos':'',
        'prescricoes':'', 'alergias':'', 'antecedentes':'', 'exames_solicitados':'', 'plano':'',
        'follow_up':'', 'medicamentos':'', 'uso_medicamentos':'', 'sinais_vitais':'',
        'qp':'', 'hda':'', 'hist_patologica':'', 'doencas_cronicas':'', 'internacoes':'',
        'antecedentes_familiares':'', 'habitos':'', 'peso':'', 'altura':'', 'diagnostico_principal':'',
        'solicitacao_exames':'',
    }
    if 'prontuario' in locals() and isinstance(prontuario, dict):
        prontuario_ctx = {**default_prontuario, **prontuario}
    else:
        prontuario_ctx = default_prontuario

    modo_edicao_flag = True if 'modo_edicao' in locals() and modo_edicao else False

    ctx = {
        'paciente': paciente,
        'paciente_uid': paciente_uid,
        'agenda_consultas': agenda_consultas,
        'pacientes_agendados': pacientes_agendados,
        'prontuario': prontuario_ctx,
        'modo_edicao': modo_edicao_flag,
    }
    return render(request, template, ctx)


# Compatibility wrapper for older URL name 'verAgenda' which used to render patient's agenda
def verAgenda(request):
    # Render the patient's agenda (list of consultas). This should not delegate to consultaGeral.
    uid = request.session.get('localId') or request.session.get('uid')
    if not uid:
        return redirect('medify_web:auth')

    try:
        from .firebase_services import obter_paciente, listar_consultas_completas_paciente
        paciente = obter_paciente(uid)
        consultas = listar_consultas_completas_paciente(paciente_uid=uid, paciente_email=(paciente.get('email') if paciente else None), paciente_nome=(paciente.get('nome') if paciente else None)) or []
    except Exception:
        consultas = []

    debug_mode = request.GET.get('debug') == '1'
    ctx = {'consultas': consultas}
    if debug_mode:
        ctx['debug_consulta_counts'] = {'count': len(consultas)}
    return render(request, 'Paciente/verAgenda.html', ctx)

def index(request):
    return render(request, 'index.html')


